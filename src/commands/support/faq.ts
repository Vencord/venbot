import { EmbedOptions, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { SUPPORT_ALLOWED_CHANNELS, VENCORD_SITE } from "~/constants";
import { makeCachedJsonFetch, silently } from "~/util";
import { run } from "~/util/run";
import { toInlineCode } from "~/util/text";

interface Faq {
    question: string;
    answer: string;
    tags: string[];
}

export const fetchFaq = makeCachedJsonFetch<Faq[]>(VENCORD_SITE + "/faq.json");

export function buildFaqEmbed(faq: Faq, invoker: User): EmbedOptions {
    return {
        title: faq.question,
        description:
            faq.answer
                // temporarily replace newlines inside codeblocks with a placeholder, so the second replace
                // doesn't remove them
                .replace(/```.+?```/gs, m => m.replaceAll("\n", "%NEWLINE%"))
                .replace(/(?<!\n)\n(?![\n\-*])/g, "")
                .replaceAll("%NEWLINE%", "\n"),
        color: 0xdd7878,
        footer: { text: `Auto-response invoked by ${invoker.tag}` },
    };
}

defineCommand({
    name: "faq",
    aliases: ["f"],
    description: "Get an answer from the [FAQ](<https://vencord.dev/faq>)",
    usage: "[tag | query]",
    async execute({ msg, createMessage, reply }, query) {
        if (!msg.inCachedGuildChannel()) return;
        if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channel.id)) return;

        const faq = await fetchFaq();

        const match = run(() => {
            if (!query) return;

            const idx = Number(query);
            if (!isNaN(idx)) return faq[idx - 1];

            query = query.toLowerCase();
            return faq.find(f =>
                f.tags.includes(query) ||
                f.question.toLowerCase().includes(query)
            );
        });

        if (match) {
            const isReply = !!msg.referencedMessage;
            if (isReply) silently(msg.delete());

            return createMessage({
                messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
                allowedMentions: { repliedUser: isReply },
                embeds: [buildFaqEmbed(match, msg.author)],
            });
        }

        return reply(
            faq
                .map(({ question, tags }, i) =>
                    `**${i + 1}**. ${question} (${tags.map(toInlineCode).join(", ")})`
                )
                .join("\n")
        );
    },
});
