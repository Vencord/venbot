import { defineCommand } from "~/Commands";
import { codeblock, reply } from "~/util";
import { resolveUser } from "~/util/resolvers";

defineCommand({
    name: "whybanne",
    description: "Why Banne?",
    aliases: ["wb", "whybanned", "banreason", "baninfo", "bi"],
    guildOnly: true,
    usage: "<user>",
    async execute(msg, userResolvable) {
        const user = await resolveUser(userResolvable).catch(() => null);
        if (!user) {
            return reply(msg, "who?");
        }

        const ban = await msg.guild.getBan(user.id).catch(() => null);
        if (!ban) {
            return reply(msg, "bro is not banne");
        }

        let reason = ban.reason || "No reason provided";
        let actor = "idk who";

        // ban command uses reason format like `actor: reason`
        if (ban.reason?.split(" ")[0].endsWith(":")) {
            const [a, ...rest] = ban.reason.split(" ");
            reason = rest.join(" ");
            actor = a;
        }

        reply(msg, `Banned by **${actor}**: ${codeblock(reason)}`);
    },
});
