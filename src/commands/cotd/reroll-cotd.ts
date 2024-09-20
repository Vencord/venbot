import { defineCommand } from "~/Commands";
import { rerollCotd } from "~/modules/regularCotd";
import { reply } from "~/util";

defineCommand({
    name: "reroll-cotd",
    description: "Rerolls the current cozy of the day",
    usage: "[hex]",
    guildOnly: true,
    modOnly: true,
    async execute(msg, hex?: string) {
        if (hex) {
            hex = hex.replace(/^#/, "0x");

            if (isNaN(parseInt(hex, 16))) {
                return reply(msg, "wtf is that hex");
            }
        }

        await rerollCotd(hex);

        return reply(msg, "Rerolled!");
    }
});
