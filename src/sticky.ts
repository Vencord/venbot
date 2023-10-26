import { AnyTextableGuildChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { SUPPORT_CHANNEL_ID } from "./constants";
import { debounce } from "./util";

const IS_ENABLED = Boolean(false);
const MESSAGE = `
 ## IF YOU'RE CRASHING, LOOK AT <#1024351821873037462>
 ## UPDATE YOUR VENCORD IF YOU'RE CRASHING
 ## IF YOUR THEME IS BROKEN, WAIT FOR YOUR THEME DEVELOPER TO FIX IT
`.trim();

let lastMsgId: string | null = null;

const repostMessage = debounce(async (channel: AnyTextableGuildChannel) => {
    if (lastMsgId) await channel.deleteMessage(lastMsgId);

    const msg = await channel.createMessage({ content: MESSAGE });
    lastMsgId = msg.id;
}, 5000);

Vaius.on("messageCreate", async msg => {
    if (!IS_ENABLED || msg.channelID !== SUPPORT_CHANNEL_ID || msg.author.bot || !msg.inCachedGuildChannel()) return;

    repostMessage(msg.channel);
});
