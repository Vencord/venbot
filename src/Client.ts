import { AnyTextableChannel, Client, Message } from "oceanic.js";

import { Commands } from "./Command";
import { Emoji, SUPPORT_ALLOWED_CHANNELS } from "./constants";
import { BotState } from "./db/botState";
import { DISCORD_TOKEN, MOD_ROLE_ID, PREFIX } from "./env";
import { lobotomiseMaybe, moderateMessage } from "./modules/moderate";
import { reply, silently } from "./util";

export const Vaius = new Client({
    auth: "Bot " + DISCORD_TOKEN,
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
    console.log(`https://discord.com/oauth2/authorize?client_id=${Vaius.user.id}&permissions=8&scope=bot+applications.commands`);

    if (BotState.helloChannelId) {
        await Vaius.rest.channels.createMessage(BotState.helloChannelId, {
            content: "I'm back !!! :DDD"
        });
        delete BotState.helloChannelId;
    }
});

const whitespaceRe = /\s+/;
const GEN_AI_ID = "974297735559806986";

Vaius.on("messageCreate", async msg => {
    if (msg.inCachedGuildChannel() && await lobotomiseMaybe(msg)) return;
    if (msg.author.bot && msg.author.id !== GEN_AI_ID) return;
    moderateMessage(msg);

    if (!msg.content?.toLowerCase().startsWith(PREFIX)) return;

    const content = msg.content.slice(PREFIX.length).trim();
    const args = content.split(whitespaceRe);

    const cmdName = args.shift()?.toLowerCase()!;
    const cmd = Commands[cmdName];
    if (!cmd) return;

    if (cmd.ownerOnly && msg.author.id !== OwnerId)
        return;

    if (cmd.guildOnly && msg.inDirectMessageChannel())
        return reply(msg, { content: "This command can only be used in servers" });

    if (cmd.permissions) {
        if (!msg.inCachedGuildChannel()) return;

        const memberPerms = msg.channel.permissionsOf(msg.member);
        if (cmd.permissions.some(perm => !memberPerms.has(perm)))
            return;
    }

    if (cmd.modOnly) {
        if (!msg.inCachedGuildChannel()) return;

        if (!msg.member.roles.includes(MOD_ROLE_ID))
            return silently(msg.createReaction(Emoji.Anger));
    }

    const noRateLimit = SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!) || msg.member?.permissions.has("MANAGE_MESSAGES");

    if (!noRateLimit && cmd.rateLimits.getOrAdd(msg.author.id))
        return;

    if (!msg.channel)
        await msg.client.rest.channels.get(msg.channelID);

    try {
        if (cmd.rawContent)
            await cmd.execute(msg as Message<AnyTextableChannel>, content.slice(cmdName.length).trim());
        else
            await cmd.execute(msg as Message<AnyTextableChannel>, ...args);
    } catch (e) {
        console.error(
            `Failed to run ${cmd.name}`,
            `\n> ${msg.content}\n`,
            e
        );
        silently(reply(msg, { content: "oop, that didn't go well 💥" }));
    }
});
