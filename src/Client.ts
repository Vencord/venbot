import { AnyTextableChannel, Client, Message } from "oceanic.js";

import { CommandContext, Commands } from "./Commands";
import { Emoji, Millis, SUPPORT_ALLOWED_CHANNELS } from "./constants";
import { BotState } from "./db/botState";
import { DISCORD_TOKEN, MOD_PERMS_ROLE_ID, PREFIXES } from "./env";
import { lobotomiseMaybe, moderateMessage } from "./modules/moderate";
import { reply } from "./util/discord";
import { silently } from "./util/functions";

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

Vaius.on("messageCreate", msg => handleMessage(msg, false));
Vaius.on("messageUpdate", (msg, oldMsg) => {
    if (oldMsg && msg.content === oldMsg.content) return;
    if (!msg.editedTimestamp) return;

    // Ignore old updates - If a very old message is loaded by a user, discord may rebuild its embeds
    // and dispatch a message update
    if (msg.editedTimestamp.getTime() < Date.now() - 5 * Millis.MINUTE) return;

    handleMessage(msg, true);
});

async function handleMessage(msg: Message, isEdit: boolean) {
    if (msg.inCachedGuildChannel() && await lobotomiseMaybe(msg)) return;
    if (msg.author.bot && msg.author.id !== GEN_AI_ID) return;
    moderateMessage(msg, isEdit);

    const lowerContent = msg.content.toLowerCase();

    const prefix = PREFIXES.find(p => lowerContent.startsWith(p));
    if (!prefix) return;

    const content = msg.content.slice(prefix.length).trim();
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

        if (!msg.member.roles.includes(MOD_PERMS_ROLE_ID))
            return silently(msg.createReaction(Emoji.Anger));
    }

    const noRateLimit = SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!) || msg.member?.permissions.has("MANAGE_MESSAGES");

    if (!noRateLimit && cmd.rateLimits.getOrAdd(msg.author.id)) {
        silently(msg.createReaction("🛑"));
        silently(msg.createReaction("snailcat:1217891976108576839"));
        return;
    }

    if (!msg.channel)
        await msg.client.rest.channels.get(msg.channelID);

    const context = new CommandContext(
        msg as Message<AnyTextableChannel>,
        prefix,
        cmdName
    );

    try {
        if (cmd.rawContent)
            await cmd.execute(context, content.slice(cmdName.length).trim());
        else
            await cmd.execute(context, ...args);
    } catch (e) {
        console.error(
            `Failed to run ${cmd.name}`,
            `\n> ${msg.content}\n`,
            e
        );
        silently(reply(msg, { content: "oop, that didn't go well 💥" }));
    }
}
