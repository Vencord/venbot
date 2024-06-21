import { mkdirSync } from "fs";
import { join } from "path";

export const VENCORD_SITE = "https://vencord.dev";

export const ASSET_DIR = join(__dirname, "..", "assets");
export const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });


export const PROD = process.env.NODE_ENV === "production";
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

export const SECONDS_IN_MS = 1000;
export const MINUTES_IN_MS = 60 * SECONDS_IN_MS;
export const HOURS_IN_MS = 60 * MINUTES_IN_MS;
export const DAYS_IN_MS = 24 * HOURS_IN_MS;

export const Emoji = {
    X: "❌",
    CheckMark: "✅",
    QuestionMark: "❓",
    Anger: "💢",
    TrashCan: "🗑️",
    Hammer: "🔨"
} as const;
