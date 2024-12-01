import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { reply } from "~/util/discord";

defineCommand({
    name: "slowmode",
    aliases: ["slow"],
    description: "Set the slowmode for the channel",
    usage: "<seconds>",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, react }, secondsArg) {
        if (secondsArg === "off") secondsArg = "0";

        const seconds = Number(secondsArg);

        if (isNaN(seconds) || seconds < 0 || seconds > 21600)
            return reply(msg, "SlowMode must be between 0 and 21600 seconds!");

        await msg.channel.edit({ rateLimitPerUser: seconds });

        return react(Emoji.CheckMark);
    }
});
