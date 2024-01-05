import { defineCommand } from "../Command";
import { ID_REGEX, reply, silently, sleep } from "../util";

defineCommand({
    name: "ban",
    aliases: ["yeet", "🍌"],
    guildOnly: true,
    permissions: ["BAN_MEMBERS"],
    async execute(msg, ...args) {
        let possibleDays = Number(args[0]) || 0;
        if (possibleDays > 0 && possibleDays < 8)
            args.shift();
        else
            possibleDays = 0;

        const ids = [] as string[];
        let reason = "Absolutely beaned";
        for (let i = 0; i < args.length; i++) {
            const id = args[i].match(ID_REGEX)?.[1];
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

defineCommand({
    name: "bam",
    execute: msg => sleep(500).then(() => reply(msg, "Done! <:BAN:1112433028917121114>"))
});
