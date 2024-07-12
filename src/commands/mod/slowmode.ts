import { defineCommand } from "~/Command";
import { Emoji } from "~/constants";
import { reply, silently } from "~/util";

defineCommand({
    name: "slowmode",
    aliases: ["slow"],
    description: "Set the slowmode for the channel",
    usage: "<seconds>",
    guildOnly: true,
    permissions: ["MANAGE_CHANNELS"],
    async execute(msg, secondsArg) {
        if (secondsArg === "off") secondsArg = "0";

        const seconds = Number(secondsArg);

        if (isNaN(seconds) || seconds < 0 || seconds > 21600)
            return reply(msg, "SlowMode must be between 0 and 21600 seconds!");

        await msg.channel.edit({ rateLimitPerUser: seconds });

        silently(msg.createReaction(Emoji.CheckMark));
    }
});
