import { defineCommand } from "~/Commands";
import { BotState } from "~/db/botState";
import { silently } from "~/util";

export async function restart(channelId: string) {
    BotState.helloChannelId = channelId;

    // systemd will restart us
    process.exit(0);
}

defineCommand({
    name: "restart",
    description: "Restart the bot",
    usage: null,
    ownerOnly: true,
    async execute({ msg, reply }) {
        await silently(reply("Restarting..."));

        await restart(msg.channelID);
    }
});
