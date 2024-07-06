import { execFile } from "~/util/childProcess";
import { makeLazy } from "~/util/lazy";

import { defineCommand } from "../Command";
import { reply } from "../util";

const getRemote = makeLazy(async () => {
    const res = await execFile("git", ["remote", "get-url", "origin"]);
    return res.stdout
        .trim()
        .replace(/\.git$/, "")
        .replace(/^git@(.+?):/, "https://$1/");
});

defineCommand({
    name: "source-code",
    aliases: ["source"],
    description: "Get the source code for this bot",
    usage: null,
    async execute(msg) {
        return reply(msg, {
            content: "I am free software! You can find my Source code at " + await getRemote()
        });
    }
});
