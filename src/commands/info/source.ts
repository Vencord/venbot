import { gitRemote } from "__gitData__";
import { defineCommand } from "~/Commands";

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute({ reply }) {
        return reply("I am free software! You can find my Source code at " + gitRemote);
    }
});
