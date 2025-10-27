import { CreateMessageOptions } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";

export function logAutoModAction(data: string | CreateMessageOptions) {
    if (!Config.channels.autoModLog) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    Vaius.rest.channels.createMessage(Config.channels.autoModLog, data);
}

export function logModerationAction(data: string | CreateMessageOptions) {
    if (!Config.channels.modLog) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    Vaius.rest.channels.createMessage(Config.channels.modLog, data);
}
