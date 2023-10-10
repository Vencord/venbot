import { join } from "path";

export const VENCORD_SITE = "https://vencord.dev";

export const DATA_DIR = join(__dirname, "..", "data");
export const PROD = process.env.NODE_ENV === "production";
export const PREFIX = PROD ? "v" : "$";

export const UPDATE_CHANNEL_ID_FILE = "./dist/update_channel_id";

export const SUPPORT_CHANNEL_ID = "1026515880080842772";
export const BOT_CHANNEL_ID = "1024286218801926184";
export const MOD_LOG_CHANNEL_ID = "1156349646965325824";

export const SUPPORT_ALLOWED_CHANNELS = [
    SUPPORT_CHANNEL_ID,
    BOT_CHANNEL_ID
];

export const MOD_ROLE_ID = "1026509424686284924";

export const SECONDS = 1000;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;
