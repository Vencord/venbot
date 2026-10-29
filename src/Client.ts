import { AnyTextableChannel, Member, Message, User } from "oceanic.js";

import { CommandContext, Commands } from "./Commands";
import Config from "./config";
import { Emoji, Millis } from "./constants";
import { BotState } from "./db/botState";
import { emojiCacheReady, ensureEmojis, getEmojiForReaction } from "./modules/emojiManager";
import { handleGithubLines } from "./modules/githubLines";
import { ocrMessage } from "./modules/messageOcr";
import { moderateMessage } from "./modules/moderation";
import { OwnerId, setOwnerId } from "./owner";
import { Deduper } from "./util/Deduper";
import { messageContainsText, reply } from "./util/discord";
import { silently } from "./util/functions";
import { handleError } from "./util/handleError";
import { Vaius } from "./Vaius";

Vaius.once("ready", async () => {
    try {
        await ensureEmojis();
    } catch (err) {
        await handleError("Failed to initialize emoji cache", err);
        process.exit(1);
    }

    Vaius.rest.oauth.getApplication().then(app => {
        setOwnerId(app.team?.ownerID ?? app.ownerID);
    });

    console.log("hi");
    console.log(`Connected as ${Vaius.user.tag} (${Vaius.user.id})`);
    console.log(`I am in ${Vaius.guilds.size} guilds`);
    console.log(`https://discord.com/oauth2/authorize?client_id=${Vaius.user.id}&permissions=8&scope=bot+applications.commands`);

    if (BotState.restartData) {
        const { channelId, messageId } = BotState.restartData;
        delete BotState.restartData;

        await Vaius.rest.channels.editMessage(channelId, messageId, { content: "hiiii :3" })
            .catch(() => Vaius.rest.channels.createMessage(channelId, { content: "hiiii :3" }));
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

const IntroRegex = /^(?:hi|hello|hey|sup|yo)? ?(?:i['’ʼʹ´]?m|i am) (.{1,32}?)$/i;
const IntroCooldown = new Deduper(30 * Millis.MINUTE);
async function handleIntroduction(msg: Message) {
    if (!msg.inCachedGuildChannel() || msg.channel.parentID === "1108135649699180705" /* support */) return;

    if (msg.content && Math.random() > 0.9 && IntroRegex.test(msg.content) && !IntroCooldown.getOrAdd(msg.author.id)) {
        const [, name] = msg.content.match(IntroRegex)!;
        if (await silently(msg.member.edit({ nick: name }))) {
            reply(msg, { content: `Hi ${name}!` });
        }
    }
}

async function handleMessage(msg: Message, isEdit: boolean) {
    if (msg.author.bot && msg.author.id !== GEN_AI_ID) return;

    moderateMessage(msg, isEdit);

    if (!isEdit) {
        ocrMessage(msg);
        handleIntroduction(msg);
        handleGithubLines(msg);
    }

    await emojiCacheReady;

    const lowerContent = msg.content.toLowerCase();

    const prefix = Config.prefixes.find(p => lowerContent.startsWith(p));
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

    if (cmd.allowedRoles) {
        if (!msg.inCachedGuildChannel()) return;

        if (!cmd.allowedRoles.some(role => msg.member.roles.includes(role)))
            return silently(msg.createReaction(Emoji.Anger));
    }

    const noRateLimit = msg.member?.permissions.has("MANAGE_MESSAGES");

    if (!noRateLimit && cmd.rateLimits.getOrAdd(msg.author.id)) {
        silently(msg.createReaction("🛑"));
        silently(msg.createReaction(getEmojiForReaction("snailcat")));
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
        handleError(`Failed to run ${cmd.name}`, e);
        silently(reply(msg, { content: "oop, that didn't go well 💥" }));
    }
}

// React with X or TrashCan to delete responses
Vaius.on("messageReactionAdd", async (maybeUncachedMsg, maybeUncachedReactor, reaction) => {
    if (reaction.emoji.name !== Emoji.X && reaction.emoji.name !== Emoji.TrashCan) return;

    const msg = maybeUncachedMsg instanceof Message
        ? maybeUncachedMsg
        : await silently(Vaius.rest.channels.getMessage(maybeUncachedMsg.channelID, maybeUncachedMsg.id));

    if (!msg || msg.author.id !== Vaius.user.id) return;

    const reactor = maybeUncachedReactor instanceof User || maybeUncachedReactor instanceof Member
        ? maybeUncachedReactor
        : await silently(Vaius.rest.users.get(maybeUncachedReactor.id));

    if (!reactor) return;

    const canDeleteMessage = msg.referencedMessage?.author.id === reactor.id || messageContainsText(msg, `Auto-response invoked by ${reactor.username}`);
    if (canDeleteMessage)
        silently(msg.delete());
});
