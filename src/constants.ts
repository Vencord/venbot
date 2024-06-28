import { mkdirSync } from "fs";
import { join } from "path";

import { NODE_ENV } from "./env";

export const VENCORD_SITE = "https://vencord.dev";

export const ASSET_DIR = join(__dirname, "..", "assets");
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });


export const PROD = NODE_ENV === "production";
export const PREFIX = PROD ? "v" : "$";

export const UPDATE_CHANNEL_ID_FILE = "./dist/update_channel_id";

export const DEV_CHANNEL_ID = "1033680203433660458";
export const SUPPORT_CHANNEL_ID = PROD ? "1026515880080842772" : DEV_CHANNEL_ID;
export const MOD_LOG_CHANNEL_ID = PROD ? "1156349646965325824" : DEV_CHANNEL_ID;
export const BOT_CHANNEL_ID = "1024286218801926184";

export const SUPPORT_ALLOWED_CHANNELS = [
    SUPPORT_CHANNEL_ID,
    BOT_CHANNEL_ID
];

export const MOD_ROLE_ID = "1026509424686284924";
export const DONOR_ROLE_ID = "1042507929485586532";

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

export const Emoji = {
    X: "❌",
    CheckMark: "✅",
    QuestionMark: "❓",
    Anger: "💢",
    TrashCan: "🗑️",
    Hammer: "🔨"
} as const;
