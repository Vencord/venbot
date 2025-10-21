import { Embed } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji, Millis } from "~/constants";
import { run, silently } from "~/util/functions";
import { isNonNullish } from "~/util/guards";
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
    description: "Query one or more rules and send them in chat",
    usage: "[... rule number(s) | search term]",
    guildOnly: true,
    async execute({ msg, react, reply }, ...query) {
        const rules = await fetchRules();

        const results = run(() => {
            const isSearch = query.some(c => isNaN(Number(c)));

            if (!isSearch) return query.map(n => rules[Number(n) - 1]);

            const search = query.join(" ").toLowerCase();

            const rule =
                rules.find(r => r.title.toLowerCase().includes(search)) ??
                rules.find(r => r.description.toLowerCase().includes(search));

            return [rule];
        });

        if (!results.length || !results.every(isNonNullish))
            return react(Emoji.QuestionMark);

        const embeds: Embed[] = results.map(r => ({
            title: `Rule ${r.title}`,
            description: r.description,
            color: 0xdd7878,
        }));

        const isReply = !!msg.referencedMessage;
        if (isReply) {
            silently(msg.delete());
            embeds.at(-1)!.footer = {
                text: `Auto-response invoked by ${msg.author.tag}`,
            };

            return msg.channel.createMessage({
                messageReference: {
                    messageID: msg.referencedMessage?.id ?? msg.id,
                },
                allowedMentions: { repliedUser: isReply },
                embeds: embeds,
            });
        }

        reply({
            embeds: embeds,
        });
    },
});
