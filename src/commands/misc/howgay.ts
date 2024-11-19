import { defineCommand } from "~/Commands";
import { resolveUser } from "~/util/resolvers";
import { seededRandom } from "~/util/seededRandom";

defineCommand({
    name: "howgay",
    aliases: ["hg"],
    description: "Check how gay someone is",
    usage: "[user (defaults to self)]",
    async execute({ msg, reply }, userResolvable) {
        const user = userResolvable
            ? await resolveUser(userResolvable)
            : msg.author;

        if (!user)
            return reply("User not found");

        const percent = (seededRandom(user.tag + "hg") * 100).toFixed(2);

        return reply(`🌈   ${userResolvable ? `${user.username} is` : "You are"} ${percent}% gay`);
    },
});
