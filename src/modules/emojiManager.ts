// generate with pnpm genTypes
import { EmojiName } from "dist/types/emojis";

export { EmojiName };

import { readdir, readFile } from "fs/promises";
import { ApplicationEmoji } from "oceanic.js";
import { join } from "path";
import { Vaius } from "~/Client";
import { ASSET_DIR } from "~/constants";

const EMOJI_DIR = join(ASSET_DIR, "emojis");

const emojiCache = new Map<string, ApplicationEmoji>();
const { promise: emojiCacheReady, resolve: resolveEmojiCacheReady } = Promise.withResolvers<void>();
export { emojiCacheReady };

const getEmojiName = (fileName: string) => fileName.replace(/\.[^/.]+$/, "");

async function uploadEmoji(fileName: string) {
    const name = getEmojiName(fileName);

    const e = await Vaius.application.createEmoji({
        name,
        image: await readFile(join(EMOJI_DIR, fileName))
    });

    emojiCache.set(name, e);
}

export async function ensureEmojis() {
    const emojiFiles = await readdir(EMOJI_DIR);

    const { items: emojis } = await Vaius.application.getEmojis();

    for (const emote of emojis) {
        emojiCache.set(emote.name, emote);
    }

    const emojisToUpload = emojiFiles.filter(f => f !== "README.md" && !emojiCache.has(getEmojiName(f)));

    if (emojisToUpload.length) {
        console.log(`EmojiManager: (${emojisToUpload.length} emojis to upload)`);
        await Promise.all(emojisToUpload.map(uploadEmoji));
        console.log("EmojiManager: Uploaded all emojis");
    }

    resolveEmojiCacheReady();
}

export function getEmojiData(name: EmojiName) {
    const e = emojiCache.get(name);
    if (!e) throw new Error(`Emoji with name "${name}" not found in cache.`);

    return e;
}

export function getEmoji(name: EmojiName) {
    const e = getEmojiData(name);

    return e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
}

export function getEmojiForReaction(name: EmojiName) {
    const { id } = getEmojiData(name);

    return `${name}:${id}`;
}
