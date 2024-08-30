import { defineCommand } from "~/Commands";
import { BotState } from "~/db/botState";
import { reply, silently } from "~/util";

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
    async execute(msg) {
        await silently(reply(msg, {
            content: "Restarting..."
        }));

        await restart(msg.channelID);
    }
});
