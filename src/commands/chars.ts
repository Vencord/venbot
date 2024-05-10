import { defineCommand } from "../Command";
import { reply } from "../util";

defineCommand({
    name: "chars",
    aliases: ["c"],
    description: "Inspect the characters in a string",
    usage: "<text>",
    rawContent: true,

    execute(msg, text) {
        return reply(msg, {
            content: String(text.length)
        });
    },
});
