import { defineCommand } from "~/Commands";
import { rerollCotd } from "~/modules/regularCotd";
import { toHexColorString } from "~/util/colors";

defineCommand({
    name: "reroll-cotd",
    description: "Rerolls the current cozy of the day",
    usage: "[hex]",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, reply }, hex?: string) {
        if (hex) {
            const parsed = Number(hex.replace(/^#/, "0x"));

            if (isNaN(parsed)) {
                return reply("wtf is that hex");
            }

            hex = toHexColorString(parsed);
        }

        await rerollCotd(hex);

        return reply("Rerolled!");
    }
});
