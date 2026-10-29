#!/bin/sh
set -e

node -e '
const fs = require("fs");
const Database = require("better-sqlite3");
const db = new Database("data/db.sqlite3");
db.exec(fs.readFileSync("sql/create.sql", "utf8"));
db.close();
'

exec node --enable-source-maps .
