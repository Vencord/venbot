import { AnyTextableGuildChannel, Message } from "oceanic.js";
import Config from "~/config";
import { Emoji, Seconds } from "~/constants";
import { softBan } from "~/util/discord";
import { fetchBuffer } from "~/util/fetch";
import { checkPromise, silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { logAutoModAction } from "~/util/logAction";
import { readTextFromImage } from "~/util/ocr";

const scamTerms = [
    "casino",
    "rakeback",
    "withdrawal",
    "bitcoin",
    "crypto"
];
const re = new RegExp(scamTerms.map(term => `\\b${term}\\b`).join("|"), "i");

export async function ocrModerate(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

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

    const didKick = await checkPromise(softBan(msg.member, 1 * Seconds.DAY, "Posted a scam message"));

    let message = `${msg.member.mention} posted a scam image in ${msg.channel.mention}`;
    if (didKick) {
        message = `${Emoji.Boot} ${message} and has been kicked`;
    }

    logAutoModAction({
        content: message,
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
