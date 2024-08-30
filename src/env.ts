import dotenv from "dotenv";
import { number, object, optional, picklist, pipe, string, transform } from "valibot";

import { mustParse } from "./util/validation";

const { error } = dotenv.config({ override: true });
if (error)
    throw error;

const configSchema = object({
    PREFIX: string(),
    DISCORD_TOKEN: string(),
    DATABASE_URL: string(),

    NODE_ENV: optional(picklist(["development", "production"])),

    GUILD_ID: string(),

    COMMUNITY_CATEGORY_CHANNEL_ID: string(),
    COMMUNITY_POST_PASS_ROLE_ID: string(),

    DEV_CHANNEL_ID: string(),
    SUPPORT_CHANNEL_ID: string(),
    BOT_CHANNEL_ID: string(),

    MOD_ROLE_ID: string(),
    MOD_LOG_CHANNEL_ID: string(),

    MOD_MAIL_CHANNEL_ID: string(),
    MOD_MAIL_LOG_CHANNEL_ID: string(),
    MOD_MAIL_BAN_ROLE_ID: string(),

    HTTP_SERVER_LISTEN_PORT: pipe(
        string(),
        transform(Number),
        number()
    ),
    HTTP_DOMAIN: string(),
    GITHUB_CLIENT_ID: string(),
    GITHUB_CLIENT_SECRET: string(),
    CONTRIBUTOR_ROLE_ID: string(),
});

const parsed = mustParse("Invalid environment variables", configSchema, process.env);

export const {
    PREFIX,
    DISCORD_TOKEN,
    DATABASE_URL,
    NODE_ENV,
    GUILD_ID,

    COMMUNITY_CATEGORY_CHANNEL_ID,
    COMMUNITY_POST_PASS_ROLE_ID,

    DEV_CHANNEL_ID,
    BOT_CHANNEL_ID,
    MOD_LOG_CHANNEL_ID,
    MOD_ROLE_ID,
    SUPPORT_CHANNEL_ID,

    MOD_MAIL_CHANNEL_ID,
    MOD_MAIL_LOG_CHANNEL_ID,
    MOD_MAIL_BAN_ROLE_ID,

    HTTP_SERVER_LISTEN_PORT,
    HTTP_DOMAIN,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,

    CONTRIBUTOR_ROLE_ID,
} = parsed;
