import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Millis } from "~/constants";
import { fetchBuffer } from "~/util/fetch";
import { silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { logModerationAction } from "~/util/logAction";
import { readTextFromImage } from "~/util/ocr";
import { until } from "~/util/time";

const scamTerms = [
    "casino",
    "rakeback",
    "withdrawal",
    "bitcoin",
    "crypto"
];
const re = new RegExp(scamTerms.map(term => `\\b${term}\\b`).join("|"), "i");

export async function ocrModerate(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (msg.member.roles.includes(Config.roles.regular)) return false;

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/"));
    if (attachments.length === 0) return false;

    const flaggedAttachment = (await Promise.all(attachments.map(async att => {
        try {
            const buf = await fetchBuffer(att.url);
            const text = await readTextFromImage(buf);
            return re.test(text) ? buf : null;
        } catch (e) {
            return null;
        }
    }))).find(isTruthy);

    if (!flaggedAttachment) return false;

    silently(msg.delete("Scam message"));
    silently(msg.member.edit({ communicationDisabledUntil: until(1 * Millis.HOUR), reason: "Scam message" }));

    logModerationAction({
        content: `${msg.member.mention} posted a scam image in ${msg.channel.mention}`,
        files: [{ contents: flaggedAttachment, name: "flagged.png" }],
        embeds: [{
            author: {
                name: msg.member.tag,
                iconURL: msg.member.avatarURL()
            },
            image: { url: "attachment://flagged.png" }
        }]
    });

    return true;
}
