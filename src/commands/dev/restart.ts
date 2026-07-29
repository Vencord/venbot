import { defineCommand } from "~/Commands";
import { BotState } from "~/db/botState";
import { backupStickyStates } from "~/modules/sticky";

export async function restart(channelId: string, messageId: string) {
    BotState.restartData = {
        channelId,
        messageId,
        stickyStates: backupStickyStates()
    };

    // systemd will restart us
    process.exit(0);
}

defineCommand({
    name: "restart",
    description: "Restart the bot",
    usage: null,
    ownerOnly: true,
    async execute({ reply }) {
        const m = await reply("Restarting...");
        await restart(m.channelID, m.id);
    }
});
