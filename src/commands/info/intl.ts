import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defineCommand } from "~/Commands";
import { ASSET_DIR } from "~/constants";
import { makeLazy } from "~/util/lazy";

const getIntlMap = makeLazy(() =>
    readFile(join(ASSET_DIR, "discord-intl-map.json"), "utf-8")
        .then(data => JSON.parse(data) as Record<string, string>)
);

defineCommand({
    name: "intl",
    description: "Look up the name of a Discord intl message hash",
    usage: "<hash>",
    async execute({ reply }, hash) {
        const map = await getIntlMap();
        return reply(map[hash] ?? "Nothing found :(");
    }
});
