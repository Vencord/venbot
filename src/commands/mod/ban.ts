import { AnyTextableGuildChannel, Message } from "oceanic.js";

import { defineCommand } from "~/Command";
import { Millis } from "~/constants";
import { codeblock, ID_REGEX, reply, silently } from "~/util";
import { pluralise, stripIndent } from "~/util/text";

import { getHighestRolePosition } from "./utils";

function parseCrap(msg: Message<AnyTextableGuildChannel>, args: string[]) {
    let possibleDays = Number(args[0]) || 0;
    if (possibleDays > 0 && possibleDays < 8)
        args.shift();
    else
        possibleDays = 0;

    const ids = [] as string[];
    let reason = "Absolutely beaned";
    let hasCustomReason = false;
    for (let i = 0; i < args.length; i++) {
        const id = args[i].match(ID_REGEX)?.[1];
        if (id) {
            ids.push(id);
        } else {
            reason = args.slice(i).join(" ");
            hasCustomReason = true;
            break;
        }
    }

    if (!hasCustomReason && !ids.length && msg.referencedMessage) {
        reason = `Banned for message: "${msg.referencedMessage.content.slice(0, 400)}"`;
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
    async execute(msg, ...args) {
        const [daysToDelete, ids, reason] = parseCrap(msg, args);

        if (!ids.length) {
            if (!msg.referencedMessage)
                return reply(msg, { content: "Gimme some users silly" });

            ids.push(msg.referencedMessage.author.id);
        }

        if (ids.length > 100) {
            return reply(msg, { content: "That's tooooo many users bestie...." });
        }

        const members = await msg.guild.fetchMembers({ userIDs: ids });

        const authorHighestRolePosition = getHighestRolePosition(msg.member);

        const failedUsers = [] as string[];
        const bannedUsers = [] as string[];
        for (const member of members) {
            if (getHighestRolePosition(member) >= authorHighestRolePosition) {
                failedUsers.push(`Failed to ban ${member.tag} (${member.id}): You can't ban someone with a higher role.`);
                continue;
            }

            await silently(
                member.user.createDM()
                    .then(dm => dm.createMessage({
                        content: `You have been banned from the Vencord Server by ${msg.author.tag}.\n## Reason:\n${codeblock(reason)}`
                    }))
            );

            await member.ban({ reason, deleteMessageDays: daysToDelete as 0 })
                .then(() => bannedUsers.push(member.tag))
                .catch(e => failedUsers.push(`Failed to ban ${member.tag} (${member.id}): \`${String(e)}\``));
        }

        let content = failedUsers.join("\n") || "Done! <:BAN:1112433028917121114>";
        if (bannedUsers.length) {
            content += `\n\nBanned ${bannedUsers.join(", ")}`;
        }

        return reply(msg, { content });
    }
});

defineCommand({
    name: "bulkban",
    description: "bulk ban up to 200 users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    guildOnly: true,
    ownerOnly: true,
    modOnly: true,
    async execute(msg, ...args) {
        const [daysToDelete, userIDs, reason] = parseCrap(msg, args);
        if (!userIDs.length) return reply(msg, { content: "Gimme some users silly" });
        if (userIDs.length > 200) return reply(msg, { content: "That's tooooo many users bestie...." });

        const res = await msg.guild.bulkBan({ userIDs, reason, deleteMessageSeconds: daysToDelete * Millis.DAY / 1000 })
            .catch(e => null);

        if (!res || !res.bannedUsers.length) return reply(msg, { content: "No bans succeeded." });
        if (!res.failedUsers.length) return reply(msg, { content: `Success! Banned ${pluralise(res.bannedUsers.length, "user")}.` });
        return reply(msg, {
            content: stripIndent`
            Successfully banned ${pluralise(res.bannedUsers.length, "user")}.
            Failed to ban ${pluralise(res.failedUsers.length, "user")} (${res.failedUsers.join(", ")}).
            `
        });
    }
});
