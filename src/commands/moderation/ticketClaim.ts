import { ChannelTypes } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { reply } from "~/util";

import { MOD_MAIL_CHANNEL_ID } from "../../env";

defineCommand({
    name: "ticket-claim",
    aliases: ["claim"],
    description: "Claims a ticket and puts a marker on it for future reference (use button when applicable, this is a temporary command)",
    usage: null,
    guildOnly: true,
    modOnly: true,
    async execute(msg) {
        if (msg.channel.parentID !== MOD_MAIL_CHANNEL_ID) {
            return reply(msg, "what, you wanna claim the channel, dummy?");
        }

        if (msg.channel.type !== ChannelTypes.PRIVATE_THREAD) {
            return reply(msg, "What");
        }

        await msg.channel.edit({
            name: `[${msg.author.username}] ${msg.channel.name}`
        });
    }
});
