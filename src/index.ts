import "source-map-support/register";
import "./env";
import "./Commands";
import "__modules__";

import {
    ApplicationCommandTypes,
    DiscordHTTPError
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";
import { BotState } from "./db/botState";
// eslint-disable-next-line no-duplicate-imports
import { DEV_CHANNEL_ID } from "./env";
import { initModListeners } from "./modules/moderate";
import { handleCommandInteraction } from "./SlashCommands";
import { codeblock, silently } from "./util";
import { inspect } from "./util/inspect";

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

async function handleError(title: string, err: unknown) {
    if (err instanceof DiscordHTTPError && err.status >= 500)
        return;

    console.error(`${title}:`, err);

    const stack = err instanceof Error && err.stack;
    const text = stack || inspect(err);

    await Vaius.rest.channels.createMessage(DEV_CHANNEL_ID, {
        embeds: [{
            title,
            description: codeblock(text, stack ? "js" : ""),
            color: 0xff0000
        }]
    });
}

process.on("unhandledRejection", err => handleError("Unhandled Rejection", err));

process.on("uncaughtException", async err => {
    await silently(handleError("Uncaught Exception. Restarting process", err));
    try {
        // proxy shouldn't throw but uncaughtException means anything could have happened so just in case
        BotState.helloChannelId = DEV_CHANNEL_ID;
    } catch { }

    process.exit(1);
});

Vaius.on("error", err => {
    // Ignore 5xx errors from Discord
    if (String(err).includes("Unexpected server response: 5"))
        return;

    handleError("Unhandled Client Error", err);
});

Vaius.connect().catch(console.error);
