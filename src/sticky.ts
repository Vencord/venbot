import { AnyTextableGuildChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { SUPPORT_CHANNEL_ID } from "./constants";
import { debounce } from "./util";

const MESSAGE = `
**BEFORE ASKING FOR HELP:**
- Try reinstalling Vencord by using the Repair option in the installer
- Read the latest <#1024351821873037462>
- Read the [FAQ](<https://vencord.dev/faq>)

READ THE ANNOUNCEMENTS
READ THE ANNOUNCEMENTS
READ THE ANNOUNCEMENTS
READ THE ANNOUNCEMENTS
READ THE ANNOUNCEMENTS
`.trim();

let lastMsgId: string | null = null;

const repostMessage = debounce(async (channel: AnyTextableGuildChannel) => {
    if (lastMsgId) await channel.deleteMessage(lastMsgId);

    const msg = await channel.createMessage({ content: MESSAGE });
    lastMsgId = msg.id;
}, 5000);

Vaius.on("messageCreate", async msg => {
    if (msg.channelID !== SUPPORT_CHANNEL_ID || msg.author.bot || !msg.inCachedGuildChannel()) return;

    repostMessage(msg.channel);
});
