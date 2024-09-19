import { defineCommand } from "~/Commands";
import { reply } from "~/util";

import { rerollCotd } from "../../modules/regularCotd";

defineCommand({
    name: "reroll-cotd",
    description: "Rerolls the current color of the day",
    usage: null,
    guildOnly: true,
    modOnly: true,
    async execute(msg) {
        await rerollCotd();

        return reply(msg, "Rerolled!");
    }
});
