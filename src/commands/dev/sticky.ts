import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { BotState } from "~/db/botState";
import { StickyState } from "~/modules/sticky";
import { toCodeblock } from "~/util/text";

defineCommand({
    name: "sticky",
    description: "Set the sticky message",
    modOnly: true,
    guildOnly: true,
    usage: "<create/set | delete/remove | on | off | delay | list> [value]",
    rawContent: true,
    execute({ reply, react, msg, prefix, commandName }, content) {
        let response: string | undefined;

        const [operation, value, ...extra] = content.split(" ");

        if (operation?.toLowerCase() === "list") {
            const mapping = Object.entries(BotState.stickies)
                .map(([channelId, state]) =>
                    `${state.enabled ? Emoji.GreenDot : Emoji.RedDot} <#${channelId}>: ${state.message}`
                )
                .join("\n\n");

            return reply(mapping);
        }

        let state = BotState.stickies[msg.channelID];
        if (!state) {
            if (operation?.toLowerCase() !== "set") {
                return reply(`No sticky found. Use ${toCodeblock(`${prefix}${commandName} set [message]`)} to create one`);
            }

            state = BotState.stickies[msg.channelID] = {
                message: "",
                delayMs: 5_000,
                enabled: true
            };
        }

        const sticky = StickyState.getOrCreate(msg.channelID);
        if (!sticky) throw new Error("Sticky state not found");

        switch (operation?.toLowerCase()) {
            case "on":
                state.enabled = true;
                response = "Sticky message enabled!";
                sticky.createDebouncer();
                sticky.createMessage();
                break;

            case "off":
                state.enabled = false;
                response = "Sticky message disabled!";
                sticky.destroy();
                break;

            case "delay":
                const delay = Number(value) * 1000;
                if (isNaN(delay)) {
                    response = "Invalid delay value!";
                } else {
                    state.delayMs = delay;
                    state.enabled = true;
                    response = `Sticky message delay set to ${delay}ms`;
                    sticky.createDebouncer();
                }
                break;

            case "create":
            case "set":
                const message = [value, ...extra].join(" ");
                if (!state) {
                    BotState.stickies[msg.channelID] = {
                        message,
                        delayMs: 5_000,
                        enabled: true
                    };
                } else {
                    state.message = message;
                    state.enabled = true;
                }
                response = "Sticky message set!";
                sticky.createDebouncer();
                sticky.createMessage();
                break;

            case "delete":
            case "remove":
                delete BotState.stickies[msg.channelID];
                sticky.destroy();
                response = "Sticky message deleted!";
                break;

            default:
                return react(Emoji.QuestionMark);
        }

        return reply(response);
    }
});
