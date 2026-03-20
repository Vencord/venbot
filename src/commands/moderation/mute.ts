import parseDuration from "parse-duration";

import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Millis, SUPPORT_ALLOWED_CHANNELS } from "~/constants";
import { silently } from "~/util/functions";
import { msToHumanReadable, toCodeblock } from "~/util/text";
import { until } from "~/util/time";

import { getHighestRolePosition, logUserRestriction, ModerationColor, parseUserIdsAndReason } from "./utils";

defineCommand({
    name: "mute",
    aliases: ["timeout", "shut", "shush", "silence"],
    description: "Mute one or more users",
    usage: "<duration> <user> [user...] [reason]",
    guildOnly: true,
    requiredRoles: [Config.roles.mod, Config.roles.helper],
    async execute({ msg, reply }, durationString, ...args) {
        const duration = parseDuration(durationString);

        if (
            msg.member.roles.includes(Config.roles.helper) &&
            !SUPPORT_ALLOWED_CHANNELS.includes(msg.channelID)
        ) {
            return reply("For support helpers, this command can only be used in support channels");
        }

        const maxDuration = (msg.member.roles.includes(Config.roles.mod))
            ? 28 * Millis.DAY
            : 3 * Millis.HOUR;

        const minDuration = 1 * Millis.HOUR;

        if (duration == null || duration < minDuration || duration > maxDuration) {
            return reply(`Duration must be between ${msToHumanReadable(minDuration)} and ${msToHumanReadable(maxDuration)}`);
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

        const reasonWithMod = `${msg.author.tag}: ${reason}`;

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
                        content: `You have been muted on the Vencord Server for ${durationText} by ${msg.author.tag}.\n## Reason:\n${toCodeblock(reasonWithMod)}`
                    }))
            );

            await member.edit({ communicationDisabledUntil: until(duration), reason: reasonWithMod })
                .then(() => mutedUsers.push(`**${member.tag}** (${member.mention})`))
                .catch(e => fails.push(`Failed to mute **${member.tag}** (${member.mention}): \`${String(e)}\``));

            logUserRestriction({
                title: "Muted User",
                user: member.user,
                id: member.id,
                reason,
                moderator: msg.author,
                jumpLink: msg.jumpLink,
                color: ModerationColor.Light,
                expires: new Date(Date.now() + duration),
            });
        }));

        let content = fails.join("\n") || "Done!";
        if (mutedUsers.length) {
            content += `\n\nMuted ${mutedUsers.join(", ")} for ${durationText}`;
        }

        return reply(content);
    },
});
