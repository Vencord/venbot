import { readFileSync, rmSync } from "fs";
import { Client } from "oceanic.js";

import { Commands } from "./Command";
import { PREFIX, SUPPORT_ALLOWED_CHANNELS, UPDATE_CHANNEL_ID_FILE } from "./constants";
import { moderateMessage } from "./modules/moderate";
import { reply, silently } from "./util";

export const Vaius = new Client({
    auth: "Bot " + process.env.DISCORD_TOKEN,
    gateway: { intents: ["ALL"] },
    allowedMentions: {
        everyone: false,
        repliedUser: false,
        roles: false,
        users: false
    }
});

export let OwnerId: string;
Vaius.once("ready", async () => {
    Vaius.rest.oauth.getApplication().then(app => {
        OwnerId = app.ownerID;
    });

    console.log("hi");
    console.log(`Connected as ${Vaius.user.tag} (${Vaius.user.id})`);
    console.log(`I am in ${Vaius.guilds.size} guilds`);

    try {
        const updateChannelId = readFileSync(UPDATE_CHANNEL_ID_FILE, "utf-8").trim();
        await Vaius.rest.channels.createMessage(updateChannelId, {
            content: "I'm back !!! :DDD"
        });

        rmSync(UPDATE_CHANNEL_ID_FILE);
    } catch { }
});

const whitespaceRe = /\s+/;

Vaius.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    moderateMessage(msg);

    if (!msg.content?.toLowerCase().startsWith(PREFIX)) return;

    const content = msg.content.slice(PREFIX.length).trim();
    const args = content.split(whitespaceRe);

    const cmdName = args.shift()?.toLowerCase()!;
    const cmd = Commands[cmdName];
    if (!cmd) return;

    if (cmd.guildOnly && !msg.inCachedGuildChannel()) return;
    if (cmd.permissions && msg.inCachedGuildChannel()) {
        if (cmd.permissions.some(p => !msg.channel.permissionsOf(msg.member).has(p))) {
            return;
        }
    }

    if (cmd.ownerOnly && msg.author.id !== OwnerId)
        return;

    const noRateLimit = SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!) || msg.member?.permissions.has("MANAGE_MESSAGES");

    if (!noRateLimit) {
        if (cmd.rateLimits.has(msg.author.id))
            return;

        cmd.rateLimits.add(msg.author.id);
        setTimeout(() => cmd.rateLimits.delete(msg.author.id), 10_000);
    }

    try {
        if (cmd.rawContent)
            await cmd.execute(msg, content.slice(cmdName.length).trim());
        else
            await cmd.execute(msg, ...args);
    } catch (e) {
        console.error(
            `Failed to run ${cmd.name}`,
            `\n> ${msg.content}\n`,
            e
        );
        silently(reply(msg, { content: "oop, that didn't go well 💥" }));
    }
});
