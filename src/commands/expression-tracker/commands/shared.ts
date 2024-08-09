import { ZWSP } from "~/util";

const THREE_SPACES_FUCK_YOU_DISCORD_WHY_WOULD_YOU_MERGE_MULTIPLE_SPACES = ` ${ZWSP} ${ZWSP} `;

export function formatCountAndName(data: string[][]) {
    const longestCountString = data.reduce((length, [count]) => Math.max(length, count.length), 0);

    return data
        .map(([count, name]) =>
            `\`${count.padStart(longestCountString, " ")}\`${THREE_SPACES_FUCK_YOU_DISCORD_WHY_WOULD_YOU_MERGE_MULTIPLE_SPACES}${name}`
        )
        .join("\n");
}
