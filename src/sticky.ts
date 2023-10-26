import { AnyTextableGuildChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { SUPPORT_CHANNEL_ID } from "./constants";
import { debounce } from "./util";

const MESSAGE = `
## Before asking for help
READ <#1024351821873037462>
READ <#1024351821873037462>
FakeNitro and BetterFolders are broken, yes. Wait.
Themes are broken, yes. Wait for theme devs to fix them.
`.trim();

let lastMsgId: string | null = null;

const repostMessage = debounce(async (channel: AnyTextableGuildChannel) => {
    if (lastMsgId) await channel.deleteMessage(lastMsgId);

    const msg = await channel.createMessage({ content: MESSAGE });
    lastMsgId = msg.id;
}, 2000);

Vaius.on("messageCreate", async msg => {
    if (msg.channelID !== SUPPORT_CHANNEL_ID || msg.author.bot || !msg.inCachedGuildChannel()) return;

    repostMessage(msg.channel);
});
