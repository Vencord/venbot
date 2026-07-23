import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { logUserRestriction } from "~/commands/moderation/utils";
import Config from "~/config";
import { Emoji, Millis, Seconds } from "~/constants";
import { softBan } from "~/util/discord";
import { fetchBuffer } from "~/util/fetch";
import { checkPromise, silently } from "~/util/functions";
import { readTextFromImage } from "~/util/ocr";
import { ComponentMessage, MediaGallery, MediaGalleryItem, TextDisplay } from "~components";

const scamTerms = [
    "casino",
    "rakeback",
    "withdraw",
    "bitcoin",
    "cryptocurrency",
    "usdt",
    "promo code",
    "deposit",
    "mrbeast",
    "prize",
    "funds"
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

    const fileData = matchedAttachments
        .filter(a => a?.isMatch)
        .map((a, i) => ({ file: { contents: a!.buffer, name: `image${i + 1}.png` }, matchedKeywords: a!.matchedKeywords }));

    const files = fileData.map(({ file }) => file);
    const mediaGallery = (
        <MediaGallery>
            {fileData.map(({ file, matchedKeywords }) =>
                <MediaGalleryItem url={`attachment://${file.name}`} description={`Matched Keywords: ${matchedKeywords?.join(", ") ?? "None"}`} />
            )}
        </MediaGallery>
    );

    const dmNotification = (
        <ComponentMessage files={files}>
            <TextDisplay>## Kicked for suspected scam</TextDisplay>
            <TextDisplay>
                You have been kicked from the Vencord server for posting a suspected scam image.
                <br /><br />
                You can find the flagged {files.length === 1 ? "image that was" : "images that were"} posted from your account below. After securing your account, you may rejoin the server.
            </TextDisplay>

            {mediaGallery}
        </ComponentMessage>
    );

    const didKick = await checkPromise(
        softBan(msg.member, 1 * Seconds.DAY, "Posted a scam message", dmNotification)
    );

    let message = `${msg.member.mention} posted a scam image in ${msg.channel.mention}`;
    if (didKick) {
        message = `${Emoji.Boot} ${message} and has been kicked`;
    }

    logUserRestriction({
        id: msg.member.id,
        user: msg.member.user,
        title: "Kicked Spammer",
        reason: `Posted a suspected scam image in ${msg.channel.mention}`,
        moderator: msg.client.user,
        jumpLink: null,
        messageProps: { files },
        extraContext: mediaGallery
    });

    return true;
}
