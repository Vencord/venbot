import { AnyTextableGuildChannel, Message, MessageTypes } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { Millis } from "~/constants";
import { codeblock, silently } from "~/util";
import { pluralise, stripIndent } from "~/util/text";

import { getHighestRolePosition, parseUserIdsAndReason } from "./utils";

function parseCrap(msg: Message<AnyTextableGuildChannel>, args: string[]) {
    let possibleDays = Number(args[0]) || 0;
    if (possibleDays > 0 && possibleDays < 8)
        args.shift();
    else
        possibleDays = 0;

    // eslint-disable-next-line prefer-const
    let { ids, reason, hasCustomReason } = parseUserIdsAndReason(args);

    if (!hasCustomReason && !ids.length && msg.referencedMessage) {
        const content = msg.referencedMessage.type === MessageTypes.AUTO_MODERATION_ACTION
            ? msg.referencedMessage.embeds[0].description!
            : msg.referencedMessage.content;
        reason = `Banned for message: "${content.slice(0, 400)}"`;
    }

    return [possibleDays, ids, `${msg.author.tag}: ${reason}`] as const;
}

defineCommand({
    name: "ban",
    description: "Ban one or more users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    aliases: ["yeet", "🍌"],
    guildOnly: true,
    modOnly: true,
    async execute({ msg, reply }, ...args) {
        const [daysToDelete, ids, reason] = parseCrap(msg, args);

        if (!ids.length) {
            if (!msg.referencedMessage)
                return reply("Gimme some users silly");

            ids.push(msg.referencedMessage.author.id);
        }

        if (ids.length > 100) {
            return reply("That's tooooo many users bestie....");
        }

        const members = await msg.guild.fetchMembers({ userIDs: ids });
        const restIds = ids.filter(id => !members.some(m => m.id === id));

        const authorHighestRolePosition = getHighestRolePosition(msg.member);

        const fails = [] as string[];
        const bannedUsers = [] as string[];

        await Promise.all([
            ...members.map(async member => {
                if (getHighestRolePosition(member) >= authorHighestRolePosition) {
                    fails.push(`Failed to ban **${member.tag}** (${member.mention}): You can't ban that person!`);
                    return;
                }

                await silently(
                    member.user.createDM()
                        .then(dm => dm.createMessage({
                            content: `You have been banned from the Vencord Server by ${msg.author.tag}.\n## Reason:\n${codeblock(reason)}`
                        }))
                );

                await member.ban({ reason, deleteMessageDays: daysToDelete as 0 })
                    .then(() => bannedUsers.push(`**${member.tag}** (${member.mention})`))
                    .catch(e => fails.push(`Failed to ban **${member.tag}** (${member.mention}): \`${String(e)}\``));
            }),

            ...restIds.map(async id => {
                await msg.guild.createBan(id, { reason, deleteMessageDays: daysToDelete as 0 })
                    .then(() => bannedUsers.push(`**<@${id}>**`))
                    .catch(e => fails.push(`Failed to ban **<@${id}>**: \`${String(e)}\``));
            })
        ]);

        let content = fails.join("\n") || "Done! <:BAN:1112433028917121114>";
        if (bannedUsers.length) {
            content += `\n\nBanned ${bannedUsers.join(", ")}`;
        }

        return reply(content);
    }
});

defineCommand({
    name: "bulkban",
    description: "bulk ban up to 200 users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    guildOnly: true,
    ownerOnly: true,
    modOnly: true,
    async execute({ msg, reply }, ...args) {
        const [daysToDelete, userIDs, reason] = parseCrap(msg, args);
        if (!userIDs.length) return reply("Gimme some users silly");
        if (userIDs.length > 200) return reply("That's tooooo many users bestie....");

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
