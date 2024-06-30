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
    GUILD_ID: string()
});

const parsed = mustParse("Invalid environment variables", configSchema, process.env);

export const {
    DATABASE_URL,
    DISCORD_TOKEN,
    NODE_ENV,
    GUILD_ID
} = parsed;
