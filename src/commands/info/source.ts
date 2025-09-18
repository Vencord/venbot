import { defineCommand } from "~/Commands";
import { getGitRemote } from "~/util/git";

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute({ reply }) {
        return reply("I am free software! You can find my Source code at " + await getGitRemote());
    }
});
