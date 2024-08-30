import { makeEmbedSpaces } from "~/util/text";

export function formatCountAndName(data: string[][]) {
    const longestCountString = data.reduce((length, [count]) => Math.max(length, count.length), 0);

    return data
        .map(([count, name]) =>
            `\`${count.padStart(longestCountString, " ")}\`${makeEmbedSpaces(3)}${name}`
        )
        .join("\n");
}
