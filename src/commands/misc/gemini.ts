import { ApiError, createPartFromUri, createUserContent, GenerateContentParameters, GoogleGenAI } from "@google/genai";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Message } from "oceanic.js";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { ASSET_DIR, Bytes, Millis } from "~/constants";
import { silently } from "~/util/functions";
import { makeLazy } from "~/util/lazy";
import { Err, Ok } from "~/util/Result";
import { toInlineCode, truncateString } from "~/util/text";
import { sleep } from "~/util/time";
import { fetchFaq } from "../support/faq";

const { apiKey, enabled, allowedRoles, bannedRoles } = Config.gemini;

const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];
const youtubeVideoRegex = /((?:https?:)\/\/)((?:www|m)\.)?((?:youtube(?:-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?/g;

const supportedMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif",

    "video/mp4",
    "video/mpeg",
    "video/mov",
    "video/avi",
    "video/x-flv",
    "video/mpg",
    "video/webm",
    "video/wmv",
    "video/3gpp",

    "audio/wav",
    "audio/mp3",
    "audio/aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac"
]);

const ai = new GoogleGenAI({ apiKey });

const getSystemPrompt = makeLazy(() => readFile(join(ASSET_DIR, "gemini-system-prompt.txt"), "utf-8"));

async function generateContent(params: Omit<GenerateContentParameters, "model">, model = models[0]) {
    try {
        const response = await ai.models.generateContent({
            ...params,
            config: {
                ...params.config,
                // Enable Google Search only for the primary model (flash)
                tools: model === models[0]
                    ? [{ googleSearch: {} }]
                    : []
            },
            model,
        });

        return {
            response,
            model
        };
    } catch (e) {
        // Fallback to next model if rate limited or overloaded
        if (e instanceof ApiError && (e.status === 429 || e.status === 503)) {
            const modelIndex = models.indexOf(model);
            const nextModel = models[modelIndex + 1];
            if (nextModel) {
                return generateContent(params, nextModel);
            }
        }

        throw e;
    }
}

async function uploadAttachments(msg: Message) {
    // Validate attachment sizes and types first
    for (const a of msg.attachments.values()) {
        if (a.size > 5 * Bytes.MB) {
            return Err(`Attachment ${toInlineCode(a.filename)} is too large. Maximum size is 5MB.`);
        }

        if (a.contentType && !supportedMimeTypes.has(a.contentType)) {
            return Err(`Attachment ${toInlineCode(a.filename)} has unsupported type ${toInlineCode(a.contentType)}.`);
        }
    }

    const errors = [] as string[];

    const files = await Promise.all(msg.attachments.map(async a => {
        try {
            const res = await fetch(a.url);
            if (!res.ok) {
                errors.push(`Failed to fetch attachment ${toInlineCode(a.filename)}: ${toInlineCode(`${res.status} ${res.statusText}`)}`);
                return null as never; // we early return so this will never be consumed
            }

            let upload = await ai.files.upload({
                file: await res.blob(),
                config: {
                    displayName: `${a.filename} uploaded by ${msg.author.tag} (${a.id})`
                }
            });

            // Poll for upload processing completion
            // Note: The API doesn't provide events, so we need to poll
            while (upload.state === "STATE_UNSPECIFIED" || upload.state === "PROCESSING") {
                await sleep(300);
                upload = await ai.files.get({
                    name: upload.name!
                });
            }

            return createPartFromUri(upload.uri!, upload.mimeType!);
        } catch (e) {
            errors.push(`Failed to upload attachment ${toInlineCode(a.filename)}: ${toInlineCode(String(e))}`);
            return null as never; // Early return before this is consumed
        }
    }));

    if (errors.length) return Err(errors.join("\n"));

    // Extract and add YouTube videos from message content
    for (const youtubeMatch of msg.content.matchAll(youtubeVideoRegex)) {
        const videoId = youtubeMatch[5];
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        files.push({
            fileData: {
                fileUri: url
            }
        });
    }

    return Ok(files);
}

defineCommand({
    enabled,

    name: "gemini",
    aliases: ["gem", "ai", "gen", "genai"],
    description: "Chat with Gemini AI",
    guildOnly: true,
    usage: "<message>",
    rawContent: true,
    rateLimit: 30 * Millis.SECOND,
    async execute({ reply, msg }, content) {
        // Check permissions: user must have allowed role and not have banned role
        const hasAllowedRole = msg.member.roles.some(r => allowedRoles.includes(r));
        const hasBannedRole = msg.member.roles.some(r => bannedRoles.includes(r));

        if (!hasAllowedRole || hasBannedRole) {
            return;
        }

        silently(msg.channel.sendTyping());

        const files = await uploadAttachments(msg);
        if (!files.ok) {
            return reply(files.error);
        }

        const contents = [
            createUserContent([
                content,
                ...files.value
            ])
        ];

        if (msg.referencedMessage) {
            const referencedFiles = await uploadAttachments(msg.referencedMessage);
            if (!referencedFiles.ok) {
                return reply(referencedFiles.error);
            }

            // Add referenced message as context
            contents.unshift(
                createUserContent([
                    `This message is being replied to, treat it as context but not as part of the conversation or prompt.\n\n${msg.referencedMessage.content}`,
                    ...referencedFiles.value
                ])
            );
        }

        const systemPrompt = (await getSystemPrompt())
            .replace("{{USER_JSON}}", JSON.stringify({
                discordId: msg.author.id,
                uniqueUsername: msg.author.username,
                displayName: msg.member.displayName
            }))
            .replace("{{VENCORD_CONTEXT}}", JSON.stringify(await fetchFaq()))
            .replace("{{EMOJI_LIST}}", JSON.stringify(msg.guild.emojis.map(e => `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`)));

        const { response, model } = await generateContent({
            contents,
            config: {
                // Limit to ~500 tokens to encourage concise responses (~2000 chars)
                // System prompt asks for 200-2000 characters, this helps enforce that
                maxOutputTokens: 500,
                systemInstruction: systemPrompt
            }
        });

        let text = response.text ?? "Bro didn't say anything";

        // Prevent JS codeblocks in support category (Vencord adds Execute button)
        const supportCategoryId = "1108135649699180705";
        if (msg.channel.parentID === supportCategoryId) {
            text = text.replaceAll(/```js\n(.+?)```/sg, (_, code) => "```ts\n" + code + "```");
        }

        const disclaimer = response.text ? `\n\n-# Response generated by ${model}. AI may be incorrect or misleading.` : "";
        reply(truncateString(text, 1900) + disclaimer);
    }
});
