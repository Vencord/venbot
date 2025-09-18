import { Embed } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji, Millis } from "~/constants";
import { run, silently } from "~/util/functions";
import { ttlLazy } from "~/util/lazy";

const { enabled, rulesChannelId } = Config.rules;

const fetchRules = ttlLazy(async () => {
    const [rulesMessage] = await Vaius.rest.channels.getMessages(rulesChannelId, { limit: 1 });

    return rulesMessage.content
        .matchAll(/\*\*((\d+)\\\. .+?)\*\*(.+?)(?=\*\*|$|\n# )/gs)
        .map(([_, title, number, description]) => ({
            number: Number(number),
            title,
            description: description.trim()
        }))
        .toArray();
}, 5 * Millis.MINUTE);

defineCommand({
    enabled,

    name: "rule",
    aliases: ["r"],
    description: "Query a rule and send it",
    usage: "<ruleNumber>",
    guildOnly: true,
    async execute({ msg, react, reply }, search, ...rest) {
        const rules = await fetchRules();

        const rule = run(() => {
            const maybeRuleNumber = Number(search);
            if (!isNaN(maybeRuleNumber) && (rules[maybeRuleNumber - 1] || !rest.length)) {
                return rules[maybeRuleNumber - 1];
            }

            const fullSearch = [search, ...rest].join(" ").toLowerCase();

            return rules.find(r => r.title.toLowerCase().includes(fullSearch)) ??
                rules.find(r => r.description.toLowerCase().includes(fullSearch));
        });

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
