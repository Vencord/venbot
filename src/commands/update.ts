import { execSync } from "child_process";
import { writeFileSync } from "fs";

import { defineCommand } from "../Command";
import { UPDATE_CHANNEL_ID_FILE } from "../constants";
import { codeblock, reply, silently } from "../util";

defineCommand({
    name: "update",
    description: "Update the bot",
    ownerOnly: true,
    async execute(msg) {
        try {
            if (!execSync("git pull").toString().includes("Fast-forward"))
                return reply(msg, {
                    content: "Already up to date"
                });

            execSync("pnpm build");

            await silently(reply(msg, {
                content: "Updated!! Now restarting..."
            }));

            writeFileSync(UPDATE_CHANNEL_ID_FILE, msg.channel!.id);

            execSync("pm2 restart vaius");
        } catch (e) {
            console.error(e);
            reply(msg, {
                content: "Failed to update: " + codeblock(String(e), "")
            });
        }
    }
});
