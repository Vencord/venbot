import { DiscordHTTPError } from "oceanic.js";

import { PROD } from "~/constants";
import { inspect } from "~/util/inspect";
import { logDevDebug } from "~/util/logAction";
import { toCodeblock } from "~/util/text";

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
