import dotenv from "dotenv";
import { object, optional, parse, picklist, string, ValiError } from "valibot";

const { error } = dotenv.config({ override: true });
if (error)
    throw error;

const configSchema = object({
    DISCORD_TOKEN: string(),
    DATABASE_URL: string(),
    NODE_ENV: optional(picklist(["development", "production"]))
});

try {
    var parsed = parse(configSchema, process.env);
} catch (e) {
    if (!(e instanceof ValiError)) throw e;

    let message = "Invalid environment variable(s): ";
    const issues = e.issues
        .map(({ path, expected, received }) => `\t${path[0].key}: expected ${expected}, got ${received}`)
        .join("\n");

    message += issues
        ? `\n${issues}`
        : e.message;

    console.error(message);
    process.exit(1);
}

export const {
    DATABASE_URL,
    DISCORD_TOKEN,
    NODE_ENV
} = parsed;
