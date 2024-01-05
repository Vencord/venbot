import { readdir, readFile } from "fs/promises";
import { join } from "path";

import { defineCommand } from "../Command";
import { DATA_DIR, SUPPORT_ALLOWED_CHANNELS } from "../constants";
import { reply } from "../util";

const instructions = {} as Record<string, string>;
const list = [] as string[][];

defineCommand({
    name: "support",
    aliases: ["s"],
    async execute(msg, ...guide) {
        if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!)) return;

        const content = instructions[guide.join(" ").toLowerCase()];
        if (content)
            return reply(msg, { content });
        else
            return reply(msg, { content: list.map(n => "- " + n.join(", ")).join("\n") });
    },
});

(async () => {
    const supportDir = join(DATA_DIR, "support");
    const files = await readdir(supportDir);

    for (const file of files) {
        const name = file.slice(0, -3).toLowerCase();
        const names = [name];

        let content = (await readFile(join(supportDir, file), "utf8")).trim();

        const frontMatter = /^---\n(.+?)\n---/s.exec(content);
        if (frontMatter) {
            content = content.slice(frontMatter[0].length).trim();
            const attrs = Object.fromEntries(
                frontMatter[1].split("\n").map(x => x.split(": ") as [string, string])
            );

            attrs.aliases?.split(",").forEach(a => {
                instructions[a.trim().toLowerCase()] = content;
                names.push(a.trim().toLowerCase());
            });
        }

        instructions[name] = content;
        list.push(names);
    }
})();
