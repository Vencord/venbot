import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { join } from "path";

import { DATA_DIR } from "~/constants";

import type { Database } from "./types";

const sqlite = new Sqlite(join(DATA_DIR, "db.sqlite3"));
sqlite.pragma("journal_mode = WAL");

const dialect = new SqliteDialect({
    database: sqlite
});

export const db = new Kysely<Database>({ dialect });
