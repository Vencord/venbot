import { ChannelTypes, EmbedOptions, MessageTypes, PublicThreadChannel, User } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { run, silently } from "~/util/functions";
import { makeEmbedSpaces } from "~/util/text";

export async function findThreads(): Promise<PublicThreadChannel[]> {
    const forumChannel = Vaius.getChannel(Config.knownIssues.knownIssuesForumId);

    if (forumChannel?.type !== ChannelTypes.GUILD_FORUM) return [];

    const threads = new Set(forumChannel.threads.values());

    const archivedThreads = await forumChannel.getPublicArchivedThreads();
    archivedThreads.threads.forEach(thread => threads.add(thread));

    return [...threads];
}


function buildURL(guildId: string, channelId: string, messageId: string) {
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

export async function buildIssueEmbed(thread: PublicThreadChannel, invoker: User, guildId: string): Promise<EmbedOptions> {
    const messages = await thread.getMessages({ limit: 50, after: (BigInt(thread.id) - 1n).toString() })
        .then(res => res.reverse())
        .then(res => res.filter(m =>
            m.content && (m.type === MessageTypes.DEFAULT || m.type === MessageTypes.THREAD_STARTER_MESSAGE)
        ))
        .then(res => res.slice(0, 10));

    if (!messages.length) throw new Error(`Failed to retrieve thread messages from ${thread.mention}`);

    let { content } = messages.shift()!;

    let i = 1;
    for (const msg of messages) {
        const previousContent = content;

        content += "\n\n";
        content += `**[\`🔗\`](${buildURL(guildId, thread.id, msg.id)})${makeEmbedSpaces(2)}Update ${i}**`;
        content += "\n";
        content += msg.content;

        if (content.length > 4096) {
            content = previousContent;
            break;
        }

        i++;
    }

    return {
        title: thread.name,
        color: 0xfc5858,
        description: content,
        url: buildURL(guildId, thread.id, thread.id),
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

        const match = run(() => {
            if (!query) return;

            const idx = Number(query);
            if (!isNaN(idx)) return threads[idx - 1];

            query = query.toLowerCase();
            return threads.find(t => t.name.toLowerCase().includes(query));
        });

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
