import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { Millis } from "~/constants";
import { deleteElement } from "~/util/arrays";
import { ignoreExpectedErrors, silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { until } from "~/util/time";
import { ChannelID, MessageID, UserID } from "~/util/types";
import { makeEmbedForMessage } from "./utils";

interface TrackedMessage {
    channelID: ChannelID;
    messageID: MessageID;
}

const userMessagesMap = new Map<UserID, TrackedMessage[]>();

export async function moderateMultiChannelSpam(msg: Message<AnyTextableGuildChannel>) {
    let trackedMessages = userMessagesMap.get(msg.author.id);
    if (!trackedMessages) {
        trackedMessages = [];
        userMessagesMap.set(msg.author.id, trackedMessages);
    }

    const currentMessageInfo: TrackedMessage = { channelID: msg.channelID, messageID: msg.id };
    trackedMessages.push(currentMessageInfo);

    setTimeout(() => {
        const trackedMessages = userMessagesMap.get(msg.author.id);
        if (trackedMessages) {
            deleteElement(trackedMessages, currentMessageInfo);
            if (!trackedMessages.length)
                userMessagesMap.delete(msg.author.id);
        }
    }, 15 * Millis.SECOND);

    const uniqueChannels = new Set<string>();
    for (const { channelID } of trackedMessages) {
        uniqueChannels.add(channelID);
    }

    if (uniqueChannels.size < 3) return false;

    const res = await ignoreExpectedErrors(msg.guild.editMember(msg.author.id, {
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Messaged >=3 different channels within 15 seconds"
    }));

    // If this is a scam bot (likely), the ocr mod may already have kicked the member, so editMember will
    // fail with Unknown Member. Safe to ignore
    if (res)
        logAutoModAction({
            content: `Muted <@${msg.author.id}> for messaging >=3 different channels within 15 seconds`,
            embeds: [makeEmbedForMessage(msg)]
        });

    await Promise.all(trackedMessages.map(m =>
        silently(msg.client.rest.channels.deleteMessage(m.channelID, m.messageID)))
    );

    return true;
}
