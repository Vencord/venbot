import { defineCommand } from "~/Commands";
import { getMainGuild } from "~/util/discord";

const LatinxRoleId = "1189709037688868964";

defineCommand({
    name: "locatelatinx",
    aliases: ["findlatinx", "ll", "wherelatinx", "latinx", "latinxia"],
    description: "Locate the elusive latinx",
    usage: null,
    async execute({ reply }) {
        const guild = getMainGuild();

        let candidates = guild!.members
            .filter(m => m.roles.includes(LatinxRoleId));

        if (!candidates.length) {
            candidates = await guild!.fetchMembers().then(members =>
                members.filter(m => m.roles.includes(LatinxRoleId))
            );
        }

        const latinx = candidates
            .filter(m => m.joinedAt)
            .sort((a, b) => b.joinedAt!.getTime() - a.joinedAt!.getTime())[0];

        reply(`<@${latinx.id}>`);
    }
});
