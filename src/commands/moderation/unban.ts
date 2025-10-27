import { defineCommand } from "~/Commands";

import { logUserRestriction, parseUserIdsAndReason } from "./utils";

defineCommand({
    name: "unban",
    description: "Unban one or more users",
    usage: "<user> [user...] [reason]",
    aliases: ["unyeet", "🍌💥"],
    guildOnly: true,
    modOnly: true,
    async execute({ msg, reply }, ...args) {
        const { ids, reason } = parseUserIdsAndReason(args);

        if (!ids.length)
            return reply("Gimme some users dummy");

        const fails = [] as string[];
        const unbannedUsers = [] as string[];
        await Promise.all(ids.map(id =>
            msg.guild.removeBan(id, `${msg.author.tag}: ${reason}`)
                .then(() => unbannedUsers.push(id))
                .catch(() => fails.push(`Failed to unban <@${id}>: User not banned`))
        ));


        let content = fails.join("\n") || "Done!";
        if (unbannedUsers.length) {
            content += "\n\nUnbanned ";

            content += unbannedUsers
                .map(id => {
                    const user = msg.client.users.get(id);
                    const s = user ? `**${user.tag}** ` : "";
                    return s + `(<@${id}>)`;
                })
                .join(", ");
        }

        for (const id of unbannedUsers) {
            logUserRestriction({
                title: "Unbanned User",
                id,
                user: msg.client.users.get(id),
                reason,
                moderator: msg.author,
                jumpLink: msg.jumpLink,
                color: 0x00ff00,
            });
        }

        return reply(content);
    }
});
