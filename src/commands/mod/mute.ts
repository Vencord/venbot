import parseDuration from "parse-duration";

import { defineCommand } from "~/Command";
import { Millis } from "~/constants";
import { ID_REGEX, reply, until } from "~/util";

import { getHighestRolePosition, parseUserIdsAndReason } from "./utils";

defineCommand({
    name: "mute",
    aliases: ["timeout", "shut", "shush", "silence"],
    description: "Mute one or more users",
    usage: "<duration> <user> [user...] [reason]",
    guildOnly: true,
    modOnly: true,
    async execute(msg, ...args) {
        let durationString = args.shift()!;
        while (args.length && !ID_REGEX.test(args[0])) {
            durationString += " " + args.shift();
        }

        const duration = parseDuration(durationString);
        if (duration == null || duration <= 0 || duration > 28 * Millis.DAY) {
            return reply(msg, { content: "Duration must be a valid time span not longer than 28 days" });
        }

        // eslint-disable-next-line prefer-const
        let { ids, reason, hasCustomReason } = parseUserIdsAndReason(args);
        if (!hasCustomReason && !ids.length && msg.referencedMessage) {
            reason = `Muted for message: "${msg.referencedMessage.content.slice(0, 400)}"`;
            ids.push(msg.referencedMessage.author.id);
        }

        if (!ids.length)
            reply(msg, { content: "Gimme some users dummy" });

        reason = `${msg.author.tag}: ${reason}`;

        const members = await msg.guild.fetchMembers({ userIDs: ids });
        const authorHighestRolePosition = getHighestRolePosition(msg.member);

        const mutedUsers = [] as string[];
        const fails = ids
            .filter(id => !members.some(m => m.id === id))
            .map(id => `Failed to mute **${id}**: User not found`);


        await Promise.all(members.map(async member => {
            if (getHighestRolePosition(member) >= authorHighestRolePosition) {
                fails.push(`Failed to mute **${member.tag}** (${member.mention}): You can't mute that person!`);
                return;
            }

            await member.edit({ communicationDisabledUntil: until(duration), reason })
                .then(() => mutedUsers.push(`**${member.tag}** (${member.mention})`))
                .catch(e => fails.push(`Failed to mute **${member.tag}** (${member.mention}): \`${String(e)}\``));
        }));

        let content = fails.join("\n") || "Done!";
        if (mutedUsers.length) {
            content += `\n\nMuted ${mutedUsers.join(", ")}`;
        }

        return reply(msg, { content });
    },
});
