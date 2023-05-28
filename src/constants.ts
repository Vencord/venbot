import { join } from "path";

export const VENCORD_SITE = "https://vencord.dev";

export const DATA_DIR = join(__dirname, "..", "data");
export const PROD = process.env.NODE_ENV === "production";
export const PREFIX = PROD ? "v" : "$";

export const UPDATE_CHANNEL_ID_FILE = "./dist/update_channel_id";
