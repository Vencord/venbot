import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { BotState } from "~/db/botState";
import { createStickyMessage, deleteStickyMessage, initStickyDebouncer } from "~/modules/sticky";
import { reply, silently } from "~/util";

defineCommand({
    name: "sticky",
    description: "Set the sticky message",
    ownerOnly: true,
    usage: "<off | on | set | delay> [value]",
    rawContent: true,
    execute(msg, content) {
        let response: string | undefined;

        const [operation, value, ...extra] = content.split(" ");

        switch (operation?.toLowerCase()) {
            case "on":
                BotState.sticky.enabled = true;
                response = "Sticky message enabled!";
                createStickyMessage();
                break;

            case "off":
                BotState.sticky.enabled = false;
                response = "Sticky message disabled!";
                deleteStickyMessage();
                break;

            case "delay":
                const delay = Number(value) * 1000;
                if (isNaN(delay)) {
                    response = "Invalid delay value!";
                } else {
                    BotState.sticky.delayMs = delay;
                    BotState.sticky.enabled = true;
                    response = `Sticky message delay set to ${delay}ms`;
                    initStickyDebouncer();
                }
                break;

            case "set":
                BotState.sticky.message = [value, ...extra].join(" ");
                BotState.sticky.enabled = true;
                response = "Sticky message set!";
                break;

            default:
                return silently(msg.createReaction(Emoji.QuestionMark));
        }

        return reply(msg, response);
    }
});
