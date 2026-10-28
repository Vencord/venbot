import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { logUserRestriction } from "~/commands/moderation/utils";
import { Colors, Emoji, Millis, REGULAR_ROLES, Seconds } from "~/constants";
import { softBan } from "~/util/discord";
import { checkPromise, silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { ComponentMessage, Container, MediaGallery, MediaGalleryItem, TextDisplay } from "~components";
import { OcrResult } from "../messageOcr";

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

export async function ocrModerate(msg: Message<AnyTextableGuildChannel>, attachments: OcrResult[]): Promise<boolean> {
    if (!msg.member || REGULAR_ROLES.some(role => msg.member.roles.includes(role))) return false;

    const isScam = attachments.some(att => re.test(att.text));
    if (!isScam) return false;

    silently(msg.delete("Scam message"));

    if (currentlySoftBanning.has(msg.member.id)) return true;
    currentlySoftBanning.add(msg.member.id);
    setTimeout(() => currentlySoftBanning.delete(msg.member.id), 10 * Millis.SECOND);

    const fileData = attachments.map((a, i) => ({
        file: {
            contents: a.fileContents,
            name: `image${i + 1}.png`
        },
        matchedKeywords: a.text.match(re)
    }));

    const files = fileData.map(({ file }) => file);
    const renderMediaGallery = (useSpoiler: boolean) => (
        <MediaGallery>
            {fileData.map(({ file, matchedKeywords }) =>
                <MediaGalleryItem
                    url={`attachment://${file.name}`}
                    description={`Matched Keywords: ${matchedKeywords?.join(", ") ?? "None"}`}
                    spoiler={useSpoiler}
                />
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

            <Container>
                {renderMediaGallery(true)}
            </Container>
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
        extraContext: renderMediaGallery(false),
        color: Colors.Pink
    }, logAutoModAction);

    return true;
}
