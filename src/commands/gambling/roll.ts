import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { randomInt } from "~/util/random";

const dieNames = ["d4", "d6", "d8", "d10", "d12", "d20"];

defineCommand({
    name: "roll",
    description: "Roll a die",
    aliases: ["dice", "die", "d", ...dieNames],
    usage: "[number of sides]",
    execute({ reply, commandName }, sides = "6") {
        if (dieNames.includes(commandName)) {
            sides = commandName.slice(1);
        }

        const limit = Number(sides);
        if (isNaN(limit) || limit < 1) {
            return reply("That's no valid die!");
        }

        const choice = randomInt(1, limit);

        return reply(`${Emoji.Die} ${choice}`);
    }
});
