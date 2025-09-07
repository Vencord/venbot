import { AnyTextableGuildChannel, Message, MessageTypes } from "oceanic.js";

import { CommandContext, defineCommand } from "~/Commands";
import { Millis } from "~/constants";
import { silently } from "~/util/functions";
import { pluralise, stripIndent, toCodeblock } from "~/util/text";

import { getEmoji } from "~/modules/emojiManager";
import { getHighestRolePosition, parseUserIdsAndReason } from "./utils";

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

    return [possibleDays, ids, reason ? `${msg.author.tag}: ${reason}` : null] as const;
}

async function banExecutor({ msg, reply }: CommandContext<true>, args: string[], isSoft: boolean) {
    const [daysToDelete, ids, reason] = parseCrap(msg, args, isSoft);

    if (daysToDelete === 0 && isSoft) return reply("softban requires a number of days to delete messages");

    if (!ids.length) {
        if (!msg.referencedMessage)
            return reply("Gimme some users silly");

        ids.push(msg.referencedMessage.author.id);
    }

    if (ids.length > 20) return reply("That's tooooo many users....");

    if (!reason) return reply("A reason is required");
    if (!isSoft && (reason.toLowerCase().includes("scam") || reason.toLowerCase().includes("hacked"))) {
        return reply("Please use `softban` for scams & hacked accounts");
    }

    const members = await msg.guild.fetchMembers({ userIDs: ids });
    const restIds = ids.filter(id => !members.some(m => m.id === id));

    const authorHighestRolePosition = getHighestRolePosition(msg.member);

    const fails = [] as string[];
    const bannedUsers = [] as string[];

    const banName = isSoft ? "softban" : "ban";

    const doBan = async (id: string) => {
        try {
            await msg.guild.createBan(id, { reason, deleteMessageDays: daysToDelete as 0 });

            bannedUsers.push(`**<@${id}>**`);

            if (isSoft)
                await msg.guild.removeBan(id, "soft-ban")
                    .catch(e => fails.push(`Failed to unban **<@${id}>**: \`${String(e)}\``));
        } catch (e) {
            fails.push(`Failed to ${banName} **<@${id}>**: \`${String(e)}\``);
        }
    };

    await Promise.all([
        ...restIds.map(doBan),
        ...members.map(async member => {
            if (getHighestRolePosition(member) >= authorHighestRolePosition) {
                fails.push(`Failed to ${banName} **${member.tag}** (${member.mention}): You can't ${banName} that person!`);
                return;
            }

            await silently(
                member.user.createDM()
                    .then(dm => dm.createMessage({
                        content: `You have been ${isSoft ? "kicked" : "banned"} from the Vencord Server by ${msg.author.tag}.\n## Reason:\n${toCodeblock(reason)}`
                    }))
            );

            await doBan(member.id);
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

defineCommand({
    name: "bulkban",
    description: "bulk ban up to 200 users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    guildOnly: true,
    ownerOnly: true,
    modOnly: true,
    async execute({ msg, reply }, ...args) {
        const [daysToDelete, userIDs, reason] = parseCrap(msg, args, false);
        if (!userIDs.length) return reply("Gimme some users silly");
        if (userIDs.length > 200) return reply("That's tooooo many users bestie....");
        if (!reason) return reply("A reason is required");

        const res = await msg.guild.bulkBan({ userIDs, reason, deleteMessageSeconds: daysToDelete * Millis.DAY / 1000 })
            .catch(e => null);

        if (!res || !res.bannedUsers.length) return reply("No bans succeeded.");

        if (!res.failedUsers.length) return reply(`Success! Banned ${pluralise(res.bannedUsers.length, "user")}.`);

        return reply(stripIndent`
            Successfully banned ${pluralise(res.bannedUsers.length, "user")}.
            Failed to ban ${pluralise(res.failedUsers.length, "user")} (${res.failedUsers.join(", ")}).
        `);
    }
});
