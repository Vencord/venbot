import { AnyTextableGuildChannel } from "oceanic.js";

import { BotState } from "~/db/botState";

import { Vaius } from "../Client";
import { SUPPORT_CHANNEL_ID } from "../env";
import { debounce, silently } from "../util";

let lastMsgId: string | null = null;

const getSupportChannel = () => Vaius.getChannel(SUPPORT_CHANNEL_ID) as AnyTextableGuildChannel;

export async function createStickyMessage() {
    await deleteStickyMessage();

    const msg = await getSupportChannel().createMessage({ content: BotState.sticky.message + "\n-+ This is an automated sticky message." });
    lastMsgId = msg.id;
}

export async function deleteStickyMessage() {
    if (lastMsgId)
        await silently(getSupportChannel().deleteMessage(lastMsgId));
}

let repostMessage: Function;

export function initStickyDebouncer() {
    repostMessage = debounce(createStickyMessage, BotState.sticky.delayMs);
}
initStickyDebouncer();

Vaius.on("messageCreate", async msg => {
    if (!BotState.sticky.enabled || msg.channelID !== SUPPORT_CHANNEL_ID || msg.author.bot) return;

    repostMessage();
});
