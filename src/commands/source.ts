import { defineCommand } from "../Command";
import { reply } from "../util";

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute(msg) {
        return reply(msg, {
            content: "I am free software! You can find my Source code at https://codeberg.org/vee/bot"
        });
    }
});
