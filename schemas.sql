CREATE TABLE IF NOT EXISTS modMail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT UNIQUE NOT NULL,
    channelId TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expressionUsed (
    id TEXT NOT NULL,
    expressionType INTEGER NOT NULL, -- 0 = emoji, 1 = sticker
    usageType INTEGER NOT NULL, -- 0 = message, 1 = reaction
    name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    userId TEXT NOT NULL
);
