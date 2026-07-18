import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { logUserRestriction } from "~/commands/moderation/utils";
import Config from "~/config";
import { Emoji, Millis, Seconds } from "~/constants";
import { deduplicate } from "~/util/arrays";
import { softBan } from "~/util/discord";
import { fetchBuffer } from "~/util/fetch";
import { checkPromise, silently } from "~/util/functions";
import { readTextFromImage } from "~/util/ocr";
import { toInlineCode } from "~/util/text";
import { MediaGallery, MediaGalleryItem } from "~components";

const scamTerms = [
    "casino",
    "rakeback",
    "withdraw",
    "bitcoin",
    "cryptocurrency",
    "usdt",
    "promotion",
    "promo code",
    "bonus",
    "deposit",
    "exclusive",
    "mrbeast",
    "prize",
    "funds",
    "wallet",
    "baller"
];
const re = new RegExp(scamTerms.map(term => `\\b${term}\\b`).join("|"), "ig");

const currentlySoftBanning = new Set<string>();

export async function ocrModerate(msg: Message<AnyTextableGuildChannel>): Promise<boolean> {
    if (!msg.member || msg.member.roles.includes(Config.roles.regular)) return false;

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/"));
    if (attachments.length === 0) return false;

    const matchedAttachments = (await Promise.all(attachments.map(async att => {
        try {
            const buffer = await fetchBuffer(att.url);
            const text = await readTextFromImage(buffer);
            const matchedKeywords = text.match(re);

            return {
                buffer,
                isMatch: !!matchedKeywords?.length,
                matchedKeywords
            };
        } catch (e) {
            return null;
        }
    })));

    if (!matchedAttachments.some(a => a?.isMatch)) return false;

    silently(msg.delete("Scam message"));

    if (currentlySoftBanning.has(msg.member.id)) return true;
    currentlySoftBanning.add(msg.member.id);
    setTimeout(() => currentlySoftBanning.delete(msg.member.id), 10 * Millis.SECOND);

    const didKick = await checkPromise(softBan(msg.member, 1 * Seconds.DAY, "Posted a scam message"));

    let message = `${msg.member.mention} posted a scam image in ${msg.channel.mention}`;
    if (didKick) {
        message = `${Emoji.Boot} ${message} and has been kicked`;
    }

    const matchedKeywords =
        deduplicate(matchedAttachments.flatMap(a => a?.matchedKeywords ?? []))
            .sort((a, b) => a.localeCompare(b))
            .map(toInlineCode)
            .join(", ");

    const fileData = matchedAttachments
        .filter(a => a?.isMatch)
        .map((a, i) => ({ file: { contents: a!.buffer, name: `image${i + 1}.png` }, matchedKeywords: a!.matchedKeywords }));

    logUserRestriction({
        id: msg.member.id,
        user: msg.member.user,
        title: "Kicked Spammer",
        reason: `Posted a suspected scam image in ${msg.channel.mention}`,
        moderator: msg.client.user,
        jumpLink: null,
        messageProps: {
            files: fileData.map(({ file }) => file),
        },
        extraContext: (
            <MediaGallery>
                {fileData.map(({ file, matchedKeywords }) =>
                    <MediaGalleryItem url={`attachment://${file.name}`} description={`Matched Keywords: ${matchedKeywords?.join(", ") ?? "None"}`} />
                )}
            </MediaGallery>
        )
    });

    return true;
}
