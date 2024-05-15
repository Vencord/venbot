import { AnyTextableGuildChannel } from "oceanic.js";

import { Vaius } from "../Client";
import { SUPPORT_CHANNEL_ID } from "../constants";
import { debounce, silently } from "../util";

const IS_ENABLED = Boolean(true);
const MESSAGE = `
## Read <#1222936386626129920> before asking for help
## Read <#1222936386626129920> before asking for help
You will be **BANNED** with no chance of appeal if you ignore this.
`.trim();

let lastMsgId: string | null = null;

const repostMessage = debounce(async (channel: AnyTextableGuildChannel) => {
    if (lastMsgId) await silently(channel.deleteMessage(lastMsgId));

    const msg = await channel.createMessage({ content: MESSAGE });
    lastMsgId = msg.id;
}, 5000);

Vaius.on("messageCreate", async msg => {
    if (!IS_ENABLED || msg.channelID !== SUPPORT_CHANNEL_ID || msg.author.bot || !msg.inCachedGuildChannel()) return;

    repostMessage(msg.channel);
});
