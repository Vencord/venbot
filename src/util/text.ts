import { ZWSP } from "~/constants";

export const makeEmbedSpaces = (amount: number) => ` ${ZWSP}`.repeat(amount);

export function pluralise(amount: number, singular: string, plural = singular + "s") {
    return amount === 1 ? `${amount} ${singular}` : `${amount} ${plural}`;
}

export function stripIndent(strings: TemplateStringsArray, ...values: any[]) {
    const string = String.raw({ raw: strings }, ...values);

    const match = string.match(/^[ \t]*(?=\S)/gm);
    if (!match) return string.trim();

    const minIndent = match.reduce((r, a) => Math.min(r, a.length), Infinity);
    return string.replace(new RegExp(`^[ \\t]{${minIndent}}`, "gm"), "").trim();
}

export function indent(s: string, indent: string | number = 4) {
    const indentStr = typeof indent === "number" ? " ".repeat(indent) : indent;
    return s.split("\n").map(l => indentStr + l).join("\n");
}

export function toTitle(s: string, separator: string | RegExp = " ") {
    return s
        .split(separator)
        .map(w => w && (w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join(" ");
}

export function snakeToTitle(s: string) {
    return s
        .split("_")
        .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

const BACKTICKS = "```";
export const toCodeblock = (s: string, lang = "") => `${BACKTICKS}${lang}\n${s.replaceAll("`", "`" + ZWSP)}${BACKTICKS}`;

export function toInlineCode(s: string) {
    return "``" + ZWSP + s.replaceAll("`", ZWSP + "`" + ZWSP) + ZWSP + "``";
}

export function countOccurrences(s: string, sub: string) {
    let i = 0, count = 0;

    while ((i = s.indexOf(sub, i)) !== -1) {
        i += sub.length;
        count++;
    }

    return count;
}

export function msToHumanReadable(ms: number, short = false) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const values = ([
        [days, "day"],
        [hours, "hour"],
        [minutes, "minute"],
        [seconds, "second"]
    ] as const).filter(([v]) => v > 0);

    if (!values.length) return "0 seconds";

    return values
        .map(
            short
                ? ([v, u]) => `${v}${u[0]}`
                : ([v, u]) => pluralise(v, u)
        )
        .join(", ");
}

export function formatTable(rows: string[][]) {
    const highestLengths = Array.from({ length: rows[0].length }, (_, i) => Math.max(...rows.map(r => r[i].length)));

    return ZWSP + rows.map(
        row => row.map((s, i) => s.padStart(highestLengths[i], " ")).join("    ")
    ).join("\n");
}

export function truncateString(s: string, maxLength: number, ellipsis = "…") {
    if (s.length <= maxLength) return s;
    return s.slice(0, maxLength - ellipsis.length) + ellipsis;
}

export function toHexColorString(color: number): string {
    return "#" + color.toString(16).padStart(6, "0");
}
