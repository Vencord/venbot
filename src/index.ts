import "./config";

import "__modules__";
import "./Client";
import "./Commands";

import { initModListeners } from "./modules/moderation/listeners";
import { silently } from "./util/functions";
import { handleError } from "./util/handleError";
import { Vaius } from "./Vaius";

export { handleError } from "./util/handleError";

initModListeners();

process.on("unhandledRejection", err => handleError("Unhandled Rejection", err));

process.on("uncaughtException", async err => {
    await silently(handleError("Uncaught Exception. Restarting process", err));
    process.exit(1);
});

Vaius.on("error", err => {
    // Ignore 5xx errors from Discord
    if (String(err).includes("Unexpected server response: 5"))
        return console.error(err);

    handleError("Unhandled Client Error", err);
});

Vaius.connect().catch(console.error);
