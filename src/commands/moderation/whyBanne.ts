import { defineCommand } from "~/Commands";
import { codeblock } from "~/util";
import { resolveUser } from "~/util/resolvers";

defineCommand({
    name: "whybanne",
    description: "Why Banne?",
    aliases: ["wb", "whybanned", "banreason", "baninfo", "bi"],
    guildOnly: true,
    usage: "<user>",
    async execute({ msg, reply }, userResolvable) {
        const user = await resolveUser(userResolvable).catch(() => null);
        if (!user) {
            return reply("who?");
        }

        const ban = await msg.guild.getBan(user.id).catch(() => null);
        if (!ban) {
            return reply("bro is not banne");
        }

        let reason = ban.reason || "No reason provided";
        let actor = "idk who";

        // ban command uses reason format like `actor: reason`
        if (ban.reason?.split(" ")[0].endsWith(":")) {
            const [a, ...rest] = ban.reason.split(" ");
            reason = rest.join(" ");
            actor = a.slice(0, -1);
        }

        reply(`Banned by **${actor}**: ${codeblock(reason)}`);
    },
});
