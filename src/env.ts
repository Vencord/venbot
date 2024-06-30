import dotenv from "dotenv";
import { object, optional, picklist, string } from "valibot";

import { mustParse } from "./util/validation";

const { error } = dotenv.config({ override: true });
if (error)
    throw error;

const configSchema = object({
    DISCORD_TOKEN: string(),
    DATABASE_URL: string(),
    NODE_ENV: optional(picklist(["development", "production"])),
    GUILD_ID: string(),
    COMMUNITY_CATEGORY_CHANNEL_ID: string(),
    COMMUNITY_POST_PASS_ROLE_ID: string(),
});

const parsed = mustParse("Invalid environment variables", configSchema, process.env);

export const {
    DATABASE_URL,
    DISCORD_TOKEN,
    NODE_ENV,
    GUILD_ID,
    COMMUNITY_CATEGORY_CHANNEL_ID,
    COMMUNITY_POST_PASS_ROLE_ID,
} = parsed;
