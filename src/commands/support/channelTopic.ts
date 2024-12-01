import { ChannelTypes } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { ChannelEmoji, Emoji } from "~/constants";
import { silently } from "~/util/functions";
import { makeConstants } from "~/util/objects";

const ChannelTextAndEmoji = makeConstants({
    [ChannelTypes.GUILD_TEXT]: ["Topic for", ChannelEmoji.Hash],
    [ChannelTypes.GUILD_FORUM]: ["Guidelines for", ChannelEmoji.Forum],
    [ChannelTypes.GUILD_VOICE]: ["Status for", ChannelEmoji.Voice],
    get default() { return this[ChannelTypes.GUILD_TEXT]; },
});

defineCommand({
    name: "channeltopic",
    aliases: ["ct", "topic"],
    description: "Show the topic of a channel or guidelines of a forum",
    usage: "[channel]",
    guildOnly: true,
    async execute({ msg, createMessage, react, reply }, channelId) {
        const channel = channelId
            ? msg.guild.channels.get(channelId.match(/\d+/)?.[0] || "")
            : msg.channel;

        if (!channel) return react(Emoji.QuestionMark);

        if (!channel.permissionsOf(msg.member).has("VIEW_CHANNEL"))
            return react(Emoji.Anger);

        const [topicText, icon] = ChannelTextAndEmoji[channel.type as keyof typeof ChannelTextAndEmoji] ?? ChannelTextAndEmoji.default;

        const topic = ("topic" in channel && channel.topic) || ("status" in channel && channel.status);
        if (!topic)
            return reply("This channel has no topic");

        let footer = "";

        const isReply = !!msg.referencedMessage;
        if (isReply) {
            footer = `Auto-response invoked by ${msg.author.tag}`;
            silently(msg.delete());
        }

        createMessage({
            content: `${topicText} ${channel.mention}`,
            embeds: [{
                title: `${icon}  ${channel.name}`,
                color: 0x2b2d31,
                description: topic,
                footer: { text: footer },
            }],
            messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
            allowedMentions: { repliedUser: isReply }
        });
    }
});
