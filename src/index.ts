import "./dotenv";
import "~commands";
import "~modules";

import {
    ApplicationCommandTypes,
    InteractionTypes
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";
import { initModListeners } from "./modules/moderate";

if (PROD) {
    Vaius.once("ready", () => {
        Vaius.application.createGlobalCommand({
            type: ApplicationCommandTypes.CHAT_INPUT,
            name: "owo",
            description: "owo",
        });
    });

    Vaius.on("interactionCreate", i =>
        i.type === InteractionTypes.APPLICATION_COMMAND && i.data.name === "owo" && i.createMessage({
            content: "owo"
        })
    );
}

initModListeners();

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

Vaius.connect().catch(console.error);
