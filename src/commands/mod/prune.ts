import { Message } from "oceanic.js";

import { defineCommand } from "~/Command";
import { reply } from "~/util";

defineCommand({
    name: "prune",
    aliases: ["purge", "clear", "delete"],
    description: "Delete a number of messages",
    usage: "<amount> [by|from|embeds|files|invites] [extra]",
    guildOnly: true,
    permissions: ["MANAGE_MESSAGES"],
    async execute(msg, amount, modifier, extra) {
        const limit = Number(amount) + 1;
        if (!limit) return reply(msg, { content: "?" });

        const filter: ((msg: Message) => boolean) | undefined = (() => {
            switch (modifier) {
                case "by":
                case "from":
                    if (extra === "bots") return m => m.author.bot;

                    const id = extra.match(/\d+/)?.[0];
                    return m => m.author.id === id;
                case "embeds":
                    return m => m.embeds.length > 0;
                case "files":
                case "attachments":
                    return m => !m.attachments.empty;
                case "invites":
                    return m => m.content.includes("discord.gg/") || m.content.includes("discord.com/invite/");
            }
        })();

        await msg.channel.purge({
            limit,
            filter
        });
    }
});
