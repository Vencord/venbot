import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { toCodeblock } from "~/util/text";

defineCommand({
    name: "coinflip",
    description: "Heads or tails?",
    usage: "[bet]>",
    aliases: ["cf", "coin", "flip"],
    execute({ reply }, bet) {
        const resultIsHeads = Math.random() < 0.5;
        const result = resultIsHeads ? "Heads" : "Tails";
        const response = `${Emoji.Coin} ${result}!`;

        if (!bet) {
            return reply(response);
        }

        bet = bet.toLowerCase();

        const betIsHeads = "heads".startsWith(bet);
        if (!betIsHeads && !"tails".startsWith(bet)) {
            return reply(`What's a ${toCodeblock(bet)}`);
        }

        const won = resultIsHeads === betIsHeads;

        return reply(`${response} You ${won ? "won" : "lost"}`);
    },
});
