import { execSync } from "child_process";

import { defineCommand } from "~/Commands";
import { codeblock, silently } from "~/util";

import { restart } from "./restart";

defineCommand({
    name: "update",
    aliases: ["up"],
    description: "Update the bot",
    usage: null,
    ownerOnly: true,
    async execute({ msg, reply }) {
        try {
            if (!execSync("git pull").toString().includes("Fast-forward"))
                return reply("Already up to date");

            await silently(reply("Updated!! Now restarting..."));

            await restart(msg.channelID);
        } catch (e) {
            console.error(e);
            reply("Failed to update: " + codeblock(String(e), ""));
        }
    }
});
