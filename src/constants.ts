import { mkdirSync } from "fs";
import { join } from "path";

import { BOT_CHANNEL_ID, DEV_CHANNEL_ID, NODE_ENV, SUPPORT_CHANNEL_ID } from "~/env";
import { makeConstants } from "~/util/objects";

export const VENCORD_SITE = "https://vencord.dev";

export const ASSET_DIR = join(__dirname, "..", "assets");
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

export const PROD = NODE_ENV === "production";

export const SUPPORT_ALLOWED_CHANNELS = [
    SUPPORT_CHANNEL_ID,
    BOT_CHANNEL_ID,
    DEV_CHANNEL_ID,
    "1345457031426871417" // Vesktop support
];

export const DONOR_ROLE_ID = "1042507929485586532";
export const REGULAR_ROLE_ID = "1026504932959977532";

export const enum Seconds {
    SECOND = 1,
    MINUTE = 60,
    HOUR = 60 * 60,
    DAY = 24 * 60 * 60,
    WEEK = 7 * 24 * 60 * 60
}

export const enum Millis {
    SECOND = 1000,
    MINUTE = 60 * 1000,
    HOUR = 60 * 60 * 1000,
    DAY = 24 * 60 * 60 * 1000,
    WEEK = 7 * 24 * 60 * 60 * 1000
}

export const Emoji = makeConstants({
    X: "❌",
    CheckMark: "✅",
    QuestionMark: "❓",
    Anger: "💢",
    TrashCan: "🗑️",
    Hammer: "🔨",

    GreenDot: "🟢",
    RedDot: "🔴",

    DoubleLeft: "⏪",
    Left: "◀️",
    InputNumbers: "🔢",
    Right: "▶️",
    DoubleRight: "⏩",

    Claim: "🛄",

    SeeNoEvil: "🙈",
    Owl: "🦉",

    Die: "🎲",
    Coin: "🪙",

    ShipIt: "<:shipit:1330992654602731530>",
});

export const ChannelEmoji = makeConstants({
    Forum: "<:forums:1308638540833361981>",
    Hash: "<:hash:1308638553827315742>",
    Voice: "<:voice:1308642929010671617>",
});

export const ZWSP = "\u200B";
