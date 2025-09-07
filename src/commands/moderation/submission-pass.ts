import { ChannelTypes } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { resolveUserId } from "~/util/resolvers";

defineCommand({
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

        await msg.guild.addMemberRole(
            id,
            Config.submissionPass.passRoleId,
            `Submission pass granted by ${msg.author.tag}`
        );

        return react(Emoji.CheckMark);
    },
});

Vaius.on("threadCreate", async thread => {
    if (thread.parent?.type !== ChannelTypes.GUILD_FORUM || thread.parent?.parent?.id !== Config.submissionPass.categoryId)
        return;

    const member = thread.guild.members.get(thread.ownerID) ?? await thread.guild.getMember(thread.ownerID).catch(() => null);
    if (member?.roles.includes(Config.submissionPass.passRoleId)) {
        member.removeRole(Config.submissionPass.passRoleId, "Submission pass used");
    }
});
