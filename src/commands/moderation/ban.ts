import { AnyTextableGuildChannel, Member, Message, MessageTypes } from "oceanic.js";

import { CommandContext, defineCommand } from "~/Commands";
import { silently } from "~/util/functions";
import { toCodeblock } from "~/util/text";

import { getEmoji } from "~/modules/emojiManager";
import { ID_REGEX } from "~/util/discord";
import { getHighestRolePosition, logUserRestriction, ModerationColor, parseUserIdsAndReason } from "./utils";

function parseCrap(msg: Message<AnyTextableGuildChannel>, args: string[], isSoft: boolean) {
    let possibleDays = Number(args[0]) || 0;
    if (possibleDays > 0 && possibleDays < 8)
        args.shift();
    else
        possibleDays = 0;


    let { ids, reason, hasCustomReason } = parseUserIdsAndReason(args, "");

    if (!hasCustomReason && !ids.length && msg.referencedMessage) {
        const content = msg.referencedMessage.type === MessageTypes.AUTO_MODERATION_ACTION
            ? msg.referencedMessage.embeds[0].description!
            : msg.referencedMessage.content;
        reason = `${isSoft ? "Softbanned" : "Banned"} for message: "${content.slice(0, 400)}"`;
    }

    return [possibleDays, ids, reason] as const;
}

async function banExecutor({ msg, reply }: CommandContext<true>, args: string[], isSoft: boolean) {
    const [daysToDelete, ids, reason] = parseCrap(msg, args, isSoft);

    if (daysToDelete === 0 && isSoft) return reply("softban requires a number of days to delete messages");

    if (!ids.length) {
        const { referencedMessage } = msg;
        if (!referencedMessage)
            return reply("Gimme some users silly");

        const { id } = referencedMessage.author;

        const targetId = id === msg.client.user.id
            ? referencedMessage.content.match(ID_REGEX)?.[1]
            : id;

        if (targetId)
            ids.push(targetId);
    }

    if (ids.length > 20) return reply("That's tooooo many users....");

    if (!reason) return reply("A reason is required");
    if (!isSoft && (reason.toLowerCase().includes("scam") || reason.toLowerCase().includes("hacked"))) {
        return reply("Please use `softban` for scams & hacked accounts");
    }

    const reasonWithMod = `${msg.author.tag}: ${reason}`;

    const members = await msg.guild.fetchMembers({ userIDs: ids });
    const restIds = ids.filter(id => !members.some(m => m.id === id));

    const authorHighestRolePosition = getHighestRolePosition(msg.member);

    const fails = [] as string[];
    const bannedUsers = [] as string[];

    const banName = isSoft ? "softban" : "ban";

    const doBan = async (id: string, member?: Member) => {
        try {
            await msg.guild.createBan(id, { reason: reasonWithMod, deleteMessageDays: daysToDelete as 0 });

            bannedUsers.push(`**<@${id}>**`);

            logUserRestriction({
                title: isSoft ? "Soft-banned User" : "Banned User",
                user: member?.user,
                id,
                reason,
                moderator: msg.author,
                jumpLink: msg.jumpLink,
                color: isSoft ? ModerationColor.Light : ModerationColor.Severe,
            });

            if (isSoft)
                await msg.guild.removeBan(id, "soft-ban")
                    .catch(e => fails.push(`Failed to unban **<@${id}>**: \`${String(e)}\``));
        } catch (e) {
            fails.push(`Failed to ${banName} **<@${id}>**: \`${String(e)}\``);
        }
    };

    await Promise.all([
        ...restIds.map(id => doBan(id)),
        ...members.map(async member => {
            if (getHighestRolePosition(member) >= authorHighestRolePosition) {
                fails.push(`Failed to ${banName} **${member.tag}** (${member.mention}): You can't ${banName} that person!`);
                return;
            }

            await silently(
                member.user.createDM()
                    .then(dm => dm.createMessage({
                        content: `You have been ${isSoft ? "kicked" : "banned"} from the Vencord Server by ${msg.author.tag}.\n## Reason:\n${toCodeblock(reasonWithMod)}`
                    }))
            );

            await doBan(member.id, member);
        }),
    ]);

    let content = fails.join("\n") || `Done! ${getEmoji("BAN")}`;
    if (bannedUsers.length) {
        content += `\n\n${banName}ned ${bannedUsers.join(", ")}`;
    }

    return reply(content);
}

defineCommand({
    name: "ban",
    description: "Ban one or more users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    aliases: ["yeet", "🍌"],
    guildOnly: true,
    modOnly: true,
    execute: (ctx, ...args) => banExecutor(ctx, args, false)
});

defineCommand({
    name: "softban",
    description: "Soft ban one or more users with an optional reason and delete message days",
    usage: "<daysToDelete> <user> [user...] [reason]",
    aliases: ["sb"],
    guildOnly: true,
    modOnly: true,
    execute: (ctx, ...args) => banExecutor(ctx, args, true)
});
