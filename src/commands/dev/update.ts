import { execSync } from "child_process";

import { defineCommand } from "~/Commands";
import { toCodeblock } from "~/util/text";

import { restart } from "./restart";

defineCommand({
    name: "update",
    aliases: ["up"],
    description: "Update the bot",
    usage: null,
    ownerOnly: true,
    async execute({ reply }) {
        try {
            if (!execSync("git pull").toString().includes("Fast-forward"))
                return reply("Already up to date");

            const m = await reply("Updated!! Now restarting...");
            await restart(m.channelID, m.id);
        } catch (e) {
            console.error(e);
            reply("Failed to update: " + toCodeblock(String(e), ""));
        }
    }
});
