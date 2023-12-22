import { defineCommand } from "../Command";
import { reply, silently } from "../util";

const idRe = /^(?:<@!?)?(\d{17,20})>?$/;

defineCommand({
    name: "ban",
    aliases: ["yeet", "🍌"],
    async execute(msg, ...args) {
        if (!msg.inCachedGuildChannel()) return;
        if (!msg.member.permissions.has("BAN_MEMBERS")) return;

        let possibleDays = Number(args[0]) || 0;
        if (possibleDays > 0 && possibleDays < 8)
            args.shift();
        else
            possibleDays = 0;

        const ids = [] as string[];
        let reason = "Absolutely beaned";
        for (let i = 0; i < args.length; i++) {
            const id = args[i].match(idRe)?.[1];
            if (id) {
                ids.push(id);
            } else {
                reason = args.slice(i).join(" ");
                break;
            }
        }
        if (!ids.length) return reply(msg, { content: "Gimme some users silly" });

        reason = `${msg.author.tag}: ${reason}`;

        const results = [] as string[];
        for (const id of ids) {
            await silently(
                msg.client.rest.channels.createDM(id)
                    .then(dm => dm.createMessage({
                        content: `You have been banned from the Vencord Server by ${msg.author.tag}.\nReason: ${reason}`
                    }))
            );

            await msg.guild.createBan(id, { reason, deleteMessageDays: possibleDays as 0 })
                .catch(e => results.push(`Failed to ban ${id}: \`${String(e)}\``));
        }

        return reply(msg, { content: results.join("\n") || "Done! <:BAN:1112433028917121114>" });
    }
});
