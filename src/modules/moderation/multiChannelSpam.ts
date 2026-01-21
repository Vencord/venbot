import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { Millis } from "~/constants";
import { silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { until } from "~/util/time";
import { makeEmbedForMessage } from "./utils";

const channelsMessagedUserMap = new Map<string, Set<string>>();

export async function moderateMultiChannelSpam(msg: Message<AnyTextableGuildChannel>) {
    let channelsMessaged = channelsMessagedUserMap.get(msg.author.id);
    if (!channelsMessaged) {
        channelsMessaged = new Set();
        channelsMessagedUserMap.set(msg.author.id, channelsMessaged);
    }

    channelsMessaged.add(msg.channelID);
    setTimeout(() => {
        const channelsMessaged = channelsMessagedUserMap.get(msg.author.id);
        if (channelsMessaged) {
            channelsMessaged.delete(msg.channelID);
            if (!channelsMessaged.size)
                channelsMessagedUserMap.delete(msg.author.id);
        }
    }, 15 * Millis.SECOND);

    if (channelsMessaged.size < 3) return false;

    await msg.member.edit({
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Messaged >=3 different channels within 15 seconds"
    });

    logAutoModAction({
        content: `Muted <@${msg.author.id}> for messaging >=3 different channels within 15 seconds`,
        embeds: [makeEmbedForMessage(msg)]
    });

    await silently(msg.delete());

    return true;
}
