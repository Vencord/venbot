import { AnyTextableGuildChannel, Message } from "oceanic.js";

import { defineCommand } from "~/Command";
import { Millis } from "~/constants";
import { ID_REGEX, reply, silently } from "~/util";
import { pluralise, stripIndent } from "~/util/text";

function parseCrap(msg: Message<AnyTextableGuildChannel>, args: string[]) {
    let possibleDays = Number(args[0]) || 0;
    if (possibleDays > 0 && possibleDays < 8)
        args.shift();
    else
        possibleDays = 0;

    const ids = [] as string[];
    let reason = "Absolutely beaned";
    for (let i = 0; i < args.length; i++) {
        const id = args[i].match(ID_REGEX)?.[1];
        if (id) {
            ids.push(id);
        } else {
            reason = args.slice(i).join(" ");
            break;
        }
    }

    return [possibleDays, ids, `${msg.author.tag}: ${reason}`] as const;
}

defineCommand({
    name: "ban",
    description: "Ban one or more users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    aliases: ["yeet", "🍌"],
    guildOnly: true,
    permissions: ["BAN_MEMBERS"],
    async execute(msg, ...args) {
        const [daysToDelete, ids, reason] = parseCrap(msg, args);

        if (!ids.length) return reply(msg, { content: "Gimme some users silly" });

        const results = [] as string[];
        for (const id of ids) {
            await silently(
                msg.client.rest.channels.createDM(id)
                    .then(dm => dm.createMessage({
                        content: `You have been banned from the Vencord Server by ${msg.author.tag}.\nReason: ${reason}`
                    }))
            );

            await msg.guild.createBan(id, { reason, deleteMessageDays: daysToDelete as 0 })
                .catch(e => results.push(`Failed to ban ${id}: \`${String(e)}\``));
        }

        return reply(msg, { content: results.join("\n") || "Done! <:BAN:1112433028917121114>" });
    }
});

defineCommand({
    name: "bulkban",
    description: "bulk ban up to 200 users with an optional reason and delete message days",
    usage: "[daysToDelete] <user> [user...] [reason]",
    guildOnly: true,
    ownerOnly: true,
    permissions: ["BAN_MEMBERS"],
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
