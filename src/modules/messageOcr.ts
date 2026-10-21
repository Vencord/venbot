import { Message } from "oceanic.js";
import sharp from "sharp";
import Config from "~/config";
import { Bytes, Millis, PROD } from "~/constants";
import { AutoResponseContentType } from "~/db";
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

const MAX_OCR_FILE_BYTES = 8 * Bytes.MB;
const MAX_OCR_TOTAL_BYTES = 24 * Bytes.MB;
const MAX_IMAGE_DIMENSION = 8_000;
const MAX_IMAGE_PIXELS = 40_000_000;

export async function ocrMessage(msg: Message) {
    if (!PROD && msg.channelID !== Config.channels.dev) return;
    if (!msg.inCachedGuildChannel()) return;

    // Don't early return here even if we match, we still want to process images for moderation purposes.
    // This can trigger an auto-response even if the message is later moderated but the alternative is delaying the response, which is worse.
    const responseMessage = await maybeAutoRespond(msg, msg.content, AutoResponseContentType.TEXT);

    let totalBytes = 0;
    const attachments = msg.attachments.filter(att => {
        if (!att.contentType?.startsWith("image/")) return false;
        if (att.size > MAX_OCR_FILE_BYTES) return false;
        if (totalBytes + att.size > MAX_OCR_TOTAL_BYTES) return false;

        totalBytes += att.size;
        return true;
    });
    if (!attachments.length) return;

    const results = (await Promise.all(attachments.map(async att => {
        try {
            const fileContents = await fetchBuffer(att.url);
            if (fileContents.byteLength > MAX_OCR_FILE_BYTES) return null;

            const { width, height } = await sharp(fileContents).metadata();
            if (!width || !height) return null;
            if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) return null;
            if (width * height > MAX_IMAGE_PIXELS) return null;

            return {
                fileContents,
                text: await readTextFromImage(fileContents)
            } as OcrResult;
        } catch {
            return null;
        }
    }))).filter((result): result is OcrResult => result !== null);

    if (await ocrModerate(msg, results)) {
        silently(responseMessage?.delete());
        return;
    }

    const isMod = msg.member.permissions.has("MANAGE_MESSAGES") || msg.member.roles.includes(Config.roles.helper);

    // Screenshots of auto-mod blocks (auto-mod bypass)
    if (!isMod && results.some(r => r.text.includes("This content is blocked by this server"))) {
        silently(msg.delete());
        silently(responseMessage?.delete());
        silently(msg.member.edit({ communicationDisabledUntil: until(30 * Millis.MINUTE), reason: "Auto-mod block bypass" }));
        return;
    }

    // If an auto-response was already triggered earlier by the message content, don't trigger another one on images
    if (responseMessage) return;

    for (const { text } of results) {
        if (await maybeAutoRespond(msg, text, AutoResponseContentType.IMAGES)) return;
    }
}
