import { ZWSP } from "../util";

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

export function toTitle(s: string) {
    return s
        .split(" ")
        .map(w => w && (w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join(" ");
}

export function snakeToTitle(s: string) {
    return s
        .split("_")
        .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

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

    return values
        .map(
            short
                ? ([v, u]) => `${v}${u[0]}`
                : ([v, u]) => pluralise(v, u)
        )
        .join(", ");
}
