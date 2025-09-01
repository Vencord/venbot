import { Embed } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { Emoji, Millis } from "~/constants";
import { RULES_CHANNEL_ID } from "~/env";
import { silently } from "~/util/functions";
import { ttlLazy } from "~/util/lazy";

const fetchRules = ttlLazy(async () => {
    const [rulesMessage] = await Vaius.rest.channels.getMessages(RULES_CHANNEL_ID, { limit: 1 });

    return rulesMessage.content
        .matchAll(/\*\*((\d+)\\\. .+?)\*\*(.+?)(?=\*\*|$)/gs)
        .map(([_, title, number, description]) => ({
            number: Number(number),
            title,
            description: description.trim()
        }))
        .toArray();
}, 5 * Millis.MINUTE);

defineCommand({
    name: "rule",
    aliases: ["r"],
    description: "Query a rule and send it",
    usage: "<ruleNumber>",
    guildOnly: true,
    async execute({ msg, react, reply }, ruleNumber) {
        if (isNaN(Number(ruleNumber)))
            return; // likely false positive like "vr chat" (funny v prefix + alias moment)

        const rules = await fetchRules();
        const rule = rules[Number(ruleNumber) - 1];

        if (!rule)
            return react(Emoji.QuestionMark);

        const embed: Embed = {
            title: rule.title,
            description: rule.description,
            color: 0xdd7878,
        };

        const isReply = !!msg.referencedMessage;
        if (isReply) {
            silently(msg.delete());
            embed.footer = {
                text: `Auto-response invoked by ${msg.author.tag}`,
            };
            return msg.channel.createMessage({
                messageReference: {
                    messageID: msg.referencedMessage?.id ?? msg.id,
                },
                allowedMentions: { repliedUser: isReply },
                embeds: [embed],
            });
        }

        reply({
            embeds: [embed],
        });
    },
});
