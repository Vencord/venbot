import { ChannelTypes, Guild } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { resolveUserId } from "~/util/resolvers";

const { categoryId, enabled, passRoleId } = Config.submissionPass;

export function grantSubmissionPass(guild: Guild, userId: string, grantedBy: string) {
    return guild.addMemberRole(
        userId,
        passRoleId,
        `Submission pass granted by ${grantedBy}`
    );
}

export function removeSubmissionPass(guild: Guild, userId: string, removedBy: string) {
    return guild.removeMemberRole(
        userId,
        passRoleId,
        `Submission pass removed by ${removedBy}`
    );
}

defineCommand({
    enabled,

    name: "submissionpass",
    aliases: ["spass", "subpass", "sp"],
    description: "Allow this user to post one submission",
    usage: "<user>",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, react, reply }, user) {
        const id = resolveUserId(user);
        if (!id)
            return reply("Invalid user input");

        await grantSubmissionPass(msg.guild, id, msg.author.tag);

        return react(Emoji.CheckMark);
    },
});

defineCommand({
    enabled,

    name: "removesubmissionpass",
    aliases: ["removespass", "removesubpass", "rspass", "rsp", "rmsp"],
    description: "Remove this user's submission pass",
    usage: "<user>",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, react, reply }, user) {
        const id = resolveUserId(user);
        if (!id)
            return reply("Invalid user input");

        await removeSubmissionPass(msg.guild, id, msg.author.tag);

        return react(Emoji.CheckMark);
    },
});

if (enabled) {
    Vaius.on("threadCreate", async thread => {
        if (thread.parent?.type !== ChannelTypes.GUILD_FORUM || thread.parent?.parent?.id !== categoryId)
            return;

        const member = thread.guild.members.get(thread.ownerID) ?? await thread.guild.getMember(thread.ownerID).catch(() => null);
        if (member?.roles.includes(passRoleId)) {
            member.removeRole(passRoleId, "Submission pass used");
        }
    });
}
