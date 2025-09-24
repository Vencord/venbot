import { mkdirSync } from "fs";
import { join } from "path";

import { makeConstants } from "~/util/objects";
import Config from "./config";

export const VENCORD_SITE = "https://vencord.dev";

export const ASSET_DIR = join(__dirname, "..", "assets");
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

export const PROD = Config.mode === "production";

export const SUPPORT_ALLOWED_CHANNELS = [
    Config.channels.dev,
    Config.channels.support,
    ...Config.channels.supportAllowedChannels
];

export const MANAGEABLE_ROLES = [
    Config.roles.donor,
    Config.roles.regular,
    Config.roles.contributor,
    ...Config.roles.manageableRoles
];

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
});

export const ZWSP = "\u200B";
