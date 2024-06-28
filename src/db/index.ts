import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
// generate via `pnpm sql:types`
import type { DB } from "kysely-codegen";

import { DATABASE_URL } from "~/env";

const sqlite = new Sqlite(DATABASE_URL);
sqlite.pragma("journal_mode = WAL");

const dialect = new SqliteDialect({
    database: sqlite
});

export const db = new Kysely<DB>({ dialect });

export const enum ExpressionType {
    EMOJI = "emoji",
    STICKER = "sticker",
}

export const enum ExpressionUsageType {
    MESSAGE = "message",
    REACTION = "reaction",
}

export const enum ExpressionFormatType {
    PNG = "png",
    APNG = "apng",
    GIF = "gif",
    LOTTIE = "lottie"
}
