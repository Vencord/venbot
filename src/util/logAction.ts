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

const makeLogger = (channelId: string): ActionLogger => logAction.bind(null, channelId);

export type ActionLogger = (data: string | CreateMessageOptions) => ReturnType<typeof logAction>;

export const logDevDebug = makeLogger(Config.channels.dev);
export const logAutoModAction = makeLogger(Config.channels.autoModLog);
export const logBotAuditAction = makeLogger(Config.channels.botAuditLog);
export const logModerationAction = makeLogger(Config.channels.modLog);
