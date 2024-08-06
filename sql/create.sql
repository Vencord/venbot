CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      TEXT    UNIQUE NOT NULL,
    channelId   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS expressions (
    id          TEXT NOT NULL PRIMARY KEY,
    name        TEXT NOT NULL,
    formatType  TEXT NOT NULL CHECK(formatType IN ('png','apng','gif','lottie'))
);

CREATE TABLE IF NOT EXISTS expressionUses (
    id              TEXT    NOT NULL,
    expressionType  TEXT    NOT NULL CHECK(expressionType IN ('emoji','sticker')),
    usageType       TEXT    NOT NULL CHECK(usageType IN ('message','reaction')),
    userId          TEXT    NOT NULL,
    messageId       TEXT    NOT NULL,

    FOREIGN KEY (id) REFERENCES expressions (id)
);

CREATE INDEX IF NOT EXISTS expressionTypeIndex on expressionUses (expressionType);

CREATE TABLE IF NOT EXISTS stickyRoles (
    id      TEXT NOT NULL PRIMARY KEY,
    roleIds TEXT NOT NULL              -- Comma separated list of role IDs. Sqlite doesn't support arrays.
);
