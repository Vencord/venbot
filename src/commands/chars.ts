import { defineCommand } from "../Command";
import { reply, ZWSP } from "../util";

let unicodeNameMap: Record<number, string> | undefined;

async function requireMap() {
    if (!unicodeNameMap) {
        const data = await fetch("https://raw.githubusercontent.com/node-unicode/node-unicode-data/main/data/15.1.0-database.txt")
            .then(res => res.text());

        unicodeNameMap = Object.fromEntries(
            data.trim().split("\n").map(line => {
                const [code, name] = line.split(";");
                return [parseInt(code, 16), name];
            }));
    }

    return unicodeNameMap;
}

defineCommand({
    name: "chars",
    aliases: ["ch", "charinfo", "char-info"],
    description: "Inspect the unicode characters in a string",
    usage: "<text>",
    rawContent: true,
    async execute(msg, text) {
        text = text.replaceAll("\n", "");
        if (!text)
            return reply(msg, { content: "https://www.youtube.com/watch?v=hiRacdl02w4" });

        const map = await requireMap();

        let result = Array.from(text, (char, i) => {
            const name = map[char.codePointAt(0)!];

            return `${i === 0 ? ZWSP : ""}\`\`${ZWSP} ${char} ${ZWSP}\`\` ${name || "?"}`;
        }).join("\n");

        if (result.length > 2000)
            result = "Result too long D:";

        return reply(msg, result);
    },
});
