import { execSync } from "child_process";

import { defineCommand } from "~/Command";
import { codeblock, reply, silently } from "~/util";

import { restart } from "./restart";

defineCommand({
    name: "update",
    // aliases: ["up"],
    description: "Update the bot",
    usage: null,
    ownerOnly: true,
    async execute(msg) {
        try {
            if (!execSync("git pull").toString().includes("Fast-forward"))
                return reply(msg, {
                    content: "Already up to date"
                });

            await silently(reply(msg, {
                content: "Updated!! Now restarting..."
            }));

            await restart(msg.channelID);
        } catch (e) {
            console.error(e);
            reply(msg, {
                content: "Failed to update: " + codeblock(String(e), "")
            });
        }
    }
});
