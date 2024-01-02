import { defineCommand } from "../Command";
import { reply } from "../util";

defineCommand({
    name: "source-code",
    aliases: ["source"],
    async execute(msg) {
        return reply(msg, {
            content: "I am free software! You can find my Source code at https://codeberg.org/vee/bot"
        });
    }
});
