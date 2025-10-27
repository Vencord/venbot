import parseDuration from "parse-duration";

import { defineCommand } from "~/Commands";
import { Millis } from "~/constants";
import { silently } from "~/util/functions";
import { msToHumanReadable, toCodeblock } from "~/util/text";
import { until } from "~/util/time";

import { getHighestRolePosition, logUserRestriction, parseUserIdsAndReason } from "./utils";

defineCommand({
    name: "mute",
    aliases: ["timeout", "shut", "shush", "silence"],
    description: "Mute one or more users",
    usage: "<duration> <user> [user...] [reason]",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, reply }, durationString, ...args) {
        const duration = parseDuration(durationString);
        if (duration == null || duration < 1 || duration > 28 * Millis.DAY) {
            return reply("Duration must be a valid time span not longer than 28 days");
        }
        const durationText = msToHumanReadable(duration);


        let { ids, reason, hasCustomReason } = parseUserIdsAndReason(args);
        if (!ids.length && msg.referencedMessage) {
            ids.push(msg.referencedMessage.author.id);
            if (!hasCustomReason)
                reason = `Muted for message: "${msg.referencedMessage.content.slice(0, 400)}"`;
        }

        if (!ids.length)
            return reply("Gimme some users dummy");

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

            silently(
                member.user.createDM()
                    .then(dm => dm.createMessage({
                        content: `You have been muted on the Vencord Server for ${durationText} by ${msg.author.tag}.\n## Reason:\n${toCodeblock(reason)}`
                    }))
            );

            await member.edit({ communicationDisabledUntil: until(duration), reason })
                .then(() => mutedUsers.push(`**${member.tag}** (${member.mention})`))
                .catch(e => fails.push(`Failed to mute **${member.tag}** (${member.mention}): \`${String(e)}\``));

            logUserRestriction({
                title: "Muted User",
                user: member.user,
                id: member.id,
                reason,
                moderator: msg.author,
                jumpLink: msg.jumpLink,
                color: 0xffff00,
            });
        }));

        let content = fails.join("\n") || "Done!";
        if (mutedUsers.length) {
            content += `\n\nMuted ${mutedUsers.join(", ")} for ${durationText}`;
        }

        return reply(content);
    },
});
