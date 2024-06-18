import { defineCommand } from "~/Command";
import { SUPPORT_ALLOWED_CHANNELS, VENCORD_SITE } from "~/constants";
import { makeCachedJsonFetch, silently } from "~/util";

interface Faq {
    question: string;
    answer: string;
    tags: string[];
}

const fetchFaq = makeCachedJsonFetch<Faq[]>(VENCORD_SITE + "/faq.json");

defineCommand({
    name: "faq",
    aliases: ["f"],
    description: "Get an answer from the [FAQ](<https://vencord.dev/faq>)",
    usage: "[tag | query]",
    async execute(msg, query) {
        if (!msg.inCachedGuildChannel()) return;
        if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channel.id)) return;

        const faq = await fetchFaq();

        const match = (() => {
            if (!query) return;

            const idx = Number(query);
            if (!isNaN(idx)) return faq[idx - 1];

            query = query.toLowerCase();
            return faq.find(f =>
                f.tags.includes(query) ||
                f.question.toLowerCase().includes(query)
            );
        })();

        if (match) {
            const isReply = !!msg.referencedMessage;
            if (isReply) silently(msg.delete());

            return msg.channel.createMessage({
                messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
                allowedMentions: { repliedUser: isReply },
                embeds: [{
                    title: match.question,
                    description:
                        match.answer
                            // temporarily replace newlines inside codeblocks with a placeholder, so the second replace
                            // doesn't remove them
                            .replace(/```.+?```/gs, m => m.replaceAll("\n", "%NEWLINE%"))
                            .replace(/(?<!\n)\n(?![\n\-*])/g, "")
                            .replaceAll("%NEWLINE%", "\n"),
                    color: 0xdd7878,
                    footer: { text: `Auto-response invoked by ${msg.author.tag}` },
                }],
            });
        }

        return msg.channel.createMessage({
            content: faq.map((f, i) =>
                `**${i + 1}**. ${f.question} (${f.tags.map(t => "`" + t + "`").join(", ")})`
            ).join("\n")
        });
    },
});
