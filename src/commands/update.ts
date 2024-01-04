import { execSync } from "child_process";
import { writeFileSync } from "fs";

import { defineCommand } from "../Command";
import { UPDATE_CHANNEL_ID_FILE } from "../constants";
import { codeblock, reply, silently } from "../util";

defineCommand({
    name: "update",
    description: "Update the bot",
    aliases: ["up"],
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

            writeFileSync(UPDATE_CHANNEL_ID_FILE, msg.channel!.id);

            execSync("systemctl --user restart venbot");
        } catch (e) {
            console.error(e);
            reply(msg, {
                content: "Failed to update: " + codeblock(String(e), "")
            });
        }
    }
});
