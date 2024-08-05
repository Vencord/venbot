import "./env";
import "~commands";
import "~modules";

import {
    ApplicationCommandTypes
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";
import { initModListeners } from "./modules/moderate";
import { handleCommandInteraction } from "./SlashCommands";

if (PROD) {
    Vaius.once("ready", () => {
        Vaius.application.createGlobalCommand({
            type: ApplicationCommandTypes.CHAT_INPUT,
            name: "owo",
            description: "owo",
        });
    });

    handleCommandInteraction({
        name: "owo",
        handle(i) {
            i.createMessage({ content: "owo " });
        }
    });
}

initModListeners();

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

Vaius.connect().catch(console.error);
