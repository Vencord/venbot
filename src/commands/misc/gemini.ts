import { ApiError, createPartFromUri, createUserContent, GenerateContentParameters, GoogleGenAI } from "@google/genai";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Message } from "oceanic.js";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { ASSET_DIR, Bytes } from "~/constants";
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

async function generateContent(config: Omit<GenerateContentParameters, "model">, model = models[0]) {
    try {
        return {
            response: await ai.models.generateContent({
                ...config,
                model
            }),
            model
        };
    } catch (e) {
        if (e instanceof ApiError && e.status === 429) {
            const nextModel = models[models.indexOf(model) + 1];
            if (nextModel) {
                return generateContent(config, nextModel);
            }
        }

        throw e;
    }
}

async function uploadAttachments(msg: Message) {
    for (const a of msg.attachments.values()) {
        if (a.size > 5 * Bytes.MB)
            return Err(`Attachment ${toInlineCode(a.filename)} is too large. Maximum size is 5MB`);

        if (a.contentType && !supportedMimeTypes.has(a.contentType))
            return Err(`Attachment ${toInlineCode(a.filename)} is of unsupported type ${toInlineCode(a.contentType)}`);
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

            // why are there no events man
            while (upload.state === "STATE_UNSPECIFIED" || upload.state === "PROCESSING") {
                await sleep(300);
                upload = await ai.files.get({
                    name: upload.name!
                });
            }

            return createPartFromUri(upload.uri!, upload.mimeType!);
        } catch (e) {
            errors.push(`Failed to upload attachment to gemini ${a.filename}: ${toInlineCode(String(e))}`);
            return null as never; // we early return so this will never be consumed
        }
    }));

    if (errors.length) return Err(errors.join("\n"));

    for (const youtubeLink of msg.content.matchAll(youtubeVideoRegex)) {
        const url = `https://www.youtube.com/watch?v=${youtubeLink[5]}`;
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
    async execute({ reply, msg }, content) {
        if (!msg.member.roles.some(r => allowedRoles.includes(r)) || msg.member.roles.some(r => bannedRoles.includes(r))) {
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
                maxOutputTokens: 2000,
                systemInstruction: systemPrompt
            }
        });

        reply(response.text
            ? truncateString(response.text, 1900) + `\n\n-# Response generated by ${model}. AI may be incorrect or misleading.`
            : "Bro didn't say anything"
        );
    }
});
