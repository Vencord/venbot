import { Message } from "oceanic.js";
import Config from "~/config";
import { Bytes, Millis, PROD } from "~/constants";
import { fetchBuffer } from "~/util/fetch";
import { silently } from "~/util/functions";
import { readTextFromImage } from "~/util/ocr";
import { until } from "~/util/time";
import { maybeAutoRespond } from "./autoResponses";
import { ocrModerate } from "./moderation/ocr";

export interface OcrResult {
    fileContents: Buffer<ArrayBuffer>;
    text: string;
}

export async function ocrMessage(msg: Message) {
    if (!PROD && msg.channelID !== Config.channels.dev) return;
    if (!msg.inCachedGuildChannel()) return;

    // Don't early return here even if we match, we still want to process images for moderation purposes.
    // This can trigger an auto-response even if the message is later moderated but the alternative is delaying the response, which is worse.
    const responseMessage = await maybeAutoRespond(msg, msg.content, false);

    const attachments = msg.attachments.filter(att => att.contentType?.startsWith("image/") && att.size < 20 * Bytes.MB);
    if (!attachments.length) return;

    const results = await Promise.all(attachments.map(att =>
        fetchBuffer(att.url)
            .then(async fileContents => ({
                fileContents,
                text: await readTextFromImage(fileContents)
            }))
    ));

    if (await ocrModerate(msg, results)) {
        silently(responseMessage?.delete());
        return;
    }

    // Screenshots of auto-mod blocks (auto-mod bypass)
    if (results.some(r => r.text.includes("This content is blocked by this server"))) {
        silently(msg.delete());
        silently(responseMessage?.delete());
        silently(msg.member.edit({ communicationDisabledUntil: until(30 * Millis.MINUTE) }));
        return;
    }

    // If an auto-response was already triggered earlier by the message content, don't trigger another one on images
    if (responseMessage) return;

    for (const { text } of results) {
        if (await maybeAutoRespond(msg, text, true)) return;
    }
}
