import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";

import type { Database } from "./types";

const sqlite = new Sqlite("./data/db.sqlite3");
sqlite.pragma("journal_mode = WAL");

const dialect = new SqliteDialect({
    database: sqlite
});

export const db = new Kysely<Database>({ dialect });
