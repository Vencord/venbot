import { Message, MessageTypes } from "oceanic.js";
import { Vaius } from "~/Client";
import { sendDm } from "~/util/discord";
import { silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { moderateImageHosts } from "./imageHosts";
import { moderateInvites } from "./invites";
import { moderateMultiChannelSpam } from "./multiChannelSpam";
import { ocrModerate } from "./ocr";
import { moderateSuspiciousFiles } from "./suspiciousFiles";

const makeSnippetChannelRules = (language?: string) => (m: Message) => {
    switch (m.type) {
        case MessageTypes.CHANNEL_PINNED_MESSAGE:
        case MessageTypes.THREAD_CREATED:
            return "";
    }

    if (!language) return;

    if (m.content.includes("```")) return;
    if (m.content.includes("https://")) return;
    if (m.attachments?.some(a => a.filename?.endsWith(`.${language}`))) return;

    return `Please only post ${language} snippets. They must be enclosed in a proper codeblock. To ask questions or discuss snippets, make a thread.`;
};

/**
 * Return type:
 * - void: no action should be taken
 * - empty string: delete silently
 * - string: delete and dm this message to the user
 */
const ChannelRules: Record<string, (m: Message) => string | void> = {
    "1028106818368589824": makeSnippetChannelRules("css"),
    "1028106792737185842": makeSnippetChannelRules("js"),
    "1102784112584040479": makeSnippetChannelRules(),
};

export async function moderateMessage(msg: Message, isEdit: boolean) {
    if (!msg.inCachedGuildChannel()) return;
    if (!msg.channel.permissionsOf(Vaius.user.id).has("MANAGE_MESSAGES")) return;

    // FIXME: make this less bad
    if (msg.messageSnapshots?.length)
        msg.content = msg.messageSnapshots[0].message?.content || msg.content;

    const warnText = ChannelRules[msg.channel.id]?.(msg);
    if (warnText !== void 0) {
        silently(msg.delete().then(() => !!warnText && sendDm(msg.author, { content: warnText })));
        return;
    }

    if (msg.member?.permissions.has("MANAGE_MESSAGES")) return;

    const moderationFunctions = [
        !isEdit && moderateMultiChannelSpam,
        moderateInvites,
        moderateImageHosts,
        moderateSuspiciousFiles,
        ocrModerate
    ].filter(isTruthy);

    for (const moderate of moderationFunctions) {
        if (await moderate(msg)) return;
    }
}
