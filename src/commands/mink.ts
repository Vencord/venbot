import { defineCommand } from "../Command";
import { reply } from "../util";

defineCommand({
    name: "minky",
    aliases: ["mink", "minker"],
    description: "minker",
    usage: null,
    async execute(msg) {
        const minker = await fetch("https://minky.materii.dev/")
            .then(r => r.ok ? r.arrayBuffer() : null);

        if (!minker)
            return reply(msg, { content: "no mink :(" });

        return reply(msg, {
            files: [{
                name: "mink.jpeg",
                contents: Buffer.from(minker)
            }]
        });
    }
});
