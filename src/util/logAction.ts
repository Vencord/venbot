import { CreateMessageOptions } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";

function logAction(channelId: string, data: string | CreateMessageOptions) {
    if (!channelId) return;

    if (typeof data === "string") {
        data = { content: data };
    }

    return Vaius.rest.channels.createMessage(channelId, data);
}

export const logDevDebug = (data: string | CreateMessageOptions) => logAction(Config.channels.dev, data);
export const logAutoModAction = (data: string | CreateMessageOptions) => logAction(Config.channels.autoModLog, data);
export const logModerationAction = (data: string | CreateMessageOptions) => logAction(Config.channels.modLog, data);
export const logBotAuditAction = (data: string | CreateMessageOptions) => logAction(Config.channels.botAuditLog, data);
