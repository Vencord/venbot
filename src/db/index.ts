import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
// generate via `pnpm sqlTypes`
import type { DB } from "kysely-codegen";

const sqlite = new Sqlite(process.env.DATABASE_URL);
sqlite.pragma("journal_mode = WAL");

const dialect = new SqliteDialect({
    database: sqlite
});

export const db = new Kysely<DB>({ dialect });
