import { ChannelTypes, EmbedOptions, PublicThreadChannel, User } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { KNOWN_ISSUES_CHANNEL_ID } from "~/env";
import { silently } from "~/util";

export async function findThreads(): Promise<PublicThreadChannel[]> {
    const forumChannel = Vaius.getChannel(KNOWN_ISSUES_CHANNEL_ID);

    if (forumChannel?.type !== ChannelTypes.GUILD_FORUM) return [];

    const threads = new Set(forumChannel.threads.values());

    const archivedThreads = await forumChannel.getPublicArchivedThreads();
    archivedThreads.threads.forEach(thread => threads.add(thread));

    return [...threads];
}


function buildURL(guildId: string, messageId: string): string {
    return messageId && `https://discord.com/channels/${guildId}/${messageId}`;
}

export async function buildIssueEmbed(thread: PublicThreadChannel, invoker: User, guildID: string): Promise<EmbedOptions> {
    const firstMessage = await thread.getMessage(thread.id);

    return {
        title: thread.name,
        color: 0xfc5858,
        description: firstMessage.content,
        url: buildURL(guildID, firstMessage.id),
        footer: { text: `Auto-response invoked by ${invoker.tag}` },
    };
}

defineCommand({
    name: "known-issue",
    aliases: ["ki", "i", "issue"],
    description: "Show issues from known-issues channel",
    guildOnly: true,
    usage: "[tag | query]",
    async execute({ msg, createMessage, reply }, query) {
        const threads = await findThreads();

        if (!threads)
            return reply("that ain't a forum channel ⁉️");

        const match = (() => {
            if (!query) return;

            const idx = Number(query);
            if (!isNaN(idx)) return threads[idx - 1];

            query = query.toLowerCase();
            return threads.find(t => t.name.toLowerCase().includes(query));
        })();

        if (match) {
            const isReply = !!msg.referencedMessage;
            if (isReply) silently(msg.delete());

            return createMessage({
                messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
                allowedMentions: { repliedUser: isReply },
                embeds: [
                    await buildIssueEmbed(
                        match,
                        msg.author,
                        msg.guild.id
                    )
                ],
            });
        }

        const response = threads
            .map(({ name }, index) => `**${index + 1}.** ${name}`)
            .join("\n");

        return reply(response || "I couldn't find any issues :d");
    }
});
