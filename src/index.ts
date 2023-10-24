import "~commands";
import "./dotenv";
import "./modmail";
import "./sticky";

import {
    ApplicationCommandTypes,
    InteractionTypes
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";

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

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

Vaius.connect().catch(console.error);
