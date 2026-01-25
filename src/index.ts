import "./config";

import "./Commands";

import "__modules__";

import {
    DiscordHTTPError
} from "oceanic.js";

import { Vaius } from "./Client";
import { PROD } from "./constants";
import { BotState } from "./db/botState";
// eslint-disable-next-line no-duplicate-imports
import Config from "./config";
import { initModListeners } from "./modules/moderation/listeners";
import { silently } from "./util/functions";
import { inspect } from "./util/inspect";
import { logDevDebug } from "./util/logAction";
import { toCodeblock } from "./util/text";

initModListeners();

export async function handleError(title: string, err: unknown) {
    if (err instanceof DiscordHTTPError && err.status >= 500)
        return;

    console.error(`${title}:`, err);

    if (!PROD) return;

    const stack = err instanceof Error && err.stack;
    const text = stack || inspect(err);

    await logDevDebug({
        embeds: [{
            title,
            description: toCodeblock(text, stack ? "js" : ""),
            color: 0xff0000
        }]
    });
}

process.on("unhandledRejection", err => handleError("Unhandled Rejection", err));

process.on("uncaughtException", async err => {
    await silently(handleError("Uncaught Exception. Restarting process", err));
    try {
        // proxy shouldn't throw but uncaughtException means anything could have happened so just in case
        BotState.helloChannelId = Config.channels.dev;
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
