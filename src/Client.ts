import { Client, Intents } from "oceanic.js";

import { Commands } from "./Command";
import { PREFIX } from "./constants";
import { moderateMessage, moderateNick } from "./moderate";
import { reply, silently } from "./util";

export const Vaius = new Client({
    auth: "Bot " + process.env.DISCORD_TOKEN,
    gateway: {
        intents:
            Intents.MESSAGE_CONTENT | Intents.GUILDS | Intents.DIRECT_MESSAGES |
            Intents.GUILD_MEMBERS | Intents.GUILD_MESSAGES | Intents.GUILD_PRESENCES
    },
    allowedMentions: {
        everyone: false,
        repliedUser: false,
        roles: false,
        users: false
    }
});

let ownerId: string;
Vaius.once("ready", () => {
    Vaius.rest.oauth.getApplication().then(app => {
        ownerId = app.ownerID;
    });

    console.log("hi");
    console.log(`Connected as ${Vaius.user.tag} (${Vaius.user.id})`);
    console.log(`I am in ${Vaius.guilds.size} guilds`);
});

const whitespaceRe = /\s+/;

Vaius.on("messageCreate", async msg => {
    if (msg.author.bot) return;
    moderateMessage(msg);

    if (!msg.content?.toLowerCase().startsWith(PREFIX)) return;

    const content = msg.content.slice(PREFIX.length).trim();
    const args = content.split(whitespaceRe);
    const cmd = Commands[args.shift()!];
    if (!cmd) return;

    if (cmd.ownerOnly && msg.author.id !== ownerId)
        return void reply(msg, { content: "💢" });

    try {
        if (cmd.rawContent)
            await cmd.execute(msg, content.slice(cmd.name.length).trim());
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

Vaius.on("guildMemberUpdate", m => moderateNick(m));
Vaius.on("guildMemberAdd", m => moderateNick(m));
