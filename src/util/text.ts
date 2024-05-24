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
        .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
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
