

import { Message } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Command";
import { db, ExpressionFormatType, ExpressionType, ExpressionUsageType } from "~/db";
import { GUILD_ID } from "~/env";
import { reply, ZWSP } from "~/util";
import { makeConstants } from "~/util/objects";
import { Paginator } from "~/util/Paginator";
import { toInlineCode, toTitle } from "~/util/text";

const ExpressionTypes = [ExpressionType.EMOJI, ExpressionType.STICKER];

interface Expression {
    id: string;
    formatType: string;
    name: string;
    count: string | number | bigint;
}

const THREE_SPACES_FUCK_YOU_DISCORD_WHY_WOULD_YOU_MERGE_MULTIPLE_SPACES = ` ${ZWSP} ${ZWSP} `;

function formatCountAndName(data: string[][]) {
    const longestCountString = data.reduce((length, [count]) => Math.max(length, count.length), 0);

    return data
        .map(([count, name]) =>
            `\`${count.padStart(longestCountString, " ")}\`${THREE_SPACES_FUCK_YOU_DISCORD_WHY_WOULD_YOU_MERGE_MULTIPLE_SPACES}${name}`
        )
        .join("\n");
}

function renderEmojis(emojis: Expression[]) {
    const guildEmojis = Vaius.guilds.get(GUILD_ID)!.emojis;

    const data = emojis
        .map(e => {
            const isUnicode = e.name === e.id;
            const isDead = !isUnicode && !guildEmojis.has(e.id);
            const isAnimated = e.formatType === "gif";

            const namePart = isUnicode
                ? e.name
                : isDead
                    ? `[${toInlineCode(`:${e.name}:`)}](https://cdn.discordapp.com/emojis/${e.id}.${e.formatType}?size=256)`
                    : `<${isAnimated ? "a" : ""}:${e.name}:${e.id}>`;

            return [e.count.toString(), namePart];
        });

    return formatCountAndName(data);
}

const StickerExtensions = {
    [ExpressionFormatType.PNG]: "png",
    [ExpressionFormatType.APNG]: "png",
    [ExpressionFormatType.GIF]: "gif",
    [ExpressionFormatType.LOTTIE]: "json",
};

function renderStickers(stickers: Expression[]) {
    const data = stickers
        .map(s => {
            const ext = StickerExtensions[s.formatType];
            const name = `[${toInlineCode(s.name)}](https://media.discordapp.net/stickers/${s.id}.${ext}?size=512)`;
            return [s.count.toString(), name];
        });

    return formatCountAndName(data);
}

const Aliases: Record<string, ExpressionType> = makeConstants({
    e: ExpressionType.EMOJI,
    emojis: ExpressionType.EMOJI,
    emote: ExpressionType.EMOJI,
    emotes: ExpressionType.EMOJI,
    s: ExpressionType.STICKER,
    stickers: ExpressionType.STICKER
});

defineCommand({
    name: "stats",
    aliases: ["st"],
    description: "Get stats about most used emojis or stickers",
    usage: `<${ExpressionTypes.join(" | ")}>`,
    async execute(msg, type: string) {
        type = Aliases[type] ?? type;

        if (!ExpressionTypes.includes(type as any))
            return reply(msg, `Invalid type. Must be one of: ${ExpressionTypes.map(toInlineCode).join(", ")}`);

        const stats = await db
            .selectFrom("expressionUses")
            .innerJoin("expressions", "expressions.id", "expressionUses.id")
            .select(({ fn }) => [
                "expressions.id",
                "expressions.name",
                "expressions.formatType",
                fn.countAll().as("count"),
                fn.sum(fn.countAll()).over().as("totalCount")
            ])
            .where("expressionType", "=", type)
            .groupBy("expressions.id")
            .orderBy("count", "desc")
            .execute();

        if (!stats.length)
            return reply(msg, `No ${type}s have been tracked yet! D:`);

        const render = type === ExpressionType.EMOJI ? renderEmojis : renderStickers;

        const paginator = new Paginator(
            toTitle(`${type} Stats`),
            stats,
            20,
            render,
            `${stats.length} ${type}s tracked  •  ${stats[0].totalCount} uses`
        );

        await paginator.create(msg);
    },
});

const customEmojiRe = /<a?:\w+:(\d+)>/;

const makeLeaderboard = (usageType: ExpressionUsageType, expressionType = ExpressionType.EMOJI) => async (msg: Message, emoji: string) => {
    let name = emoji;
    let id: string | undefined;
    if (expressionType === ExpressionType.EMOJI) {
        id = customEmojiRe.exec(emoji)?.[1] ?? emoji;
    } else {
        const sticker = msg.stickerItems?.[0];
        if (sticker) {
            ({ name, id } = sticker);
        }
    }

    if (!id) return reply(msg, { content: `Did you forget to specify the ${expressionType}?` });

    const stats = await db.selectFrom("expressionUses")
        .select(({ fn }) => [
            "userId",
            fn.countAll().as("count"),
            fn.sum(fn.countAll()).over().as("totalCount")
        ])
        .where(eb => eb.and({
            id,
            usageType,
            expressionType
        }))
        .groupBy("userId")
        .orderBy("count", "desc")
        .execute();

    if (!stats.length)
        return reply(msg, `Either no one has used ${customEmojiRe.test(name) ? name : toInlineCode(name)} yet, or it's not a valid ${expressionType}!`);

    const paginator = new Paginator(
        toTitle(`Top  ${name}  ${usageType === ExpressionUsageType.MESSAGE ? "Users" : "Reactors"}`),
        stats,
        20,
        users => formatCountAndName(users.map(({ count, userId }) => [count.toString(), `<@${userId}>`])),
        `used by ${stats.length} users •  used ${stats[0].totalCount} times`
    );

    await paginator.create(msg);
};

defineCommand({
    name: "emoji-leaderboard",
    aliases: ["elb", "e-lb", "emojilb", "emoji-lb"],
    description: "Check who sent an emoji the most",
    usage: "<emoji>",
    execute: makeLeaderboard(ExpressionUsageType.MESSAGE),
});

defineCommand({
    name: "reaction-leaderboard",
    aliases: ["rlb", "r-lb", "reactionlb", "reaction-lb"],
    description: "Check who reacted with an emoji the most",
    usage: "<emoji>",
    execute: makeLeaderboard(ExpressionUsageType.REACTION),
});

defineCommand({
    name: "sticker-leaderboard",
    aliases: ["slb", "s-lb", "stickerlb", "sticker-lb"],
    description: "Check who sent a sticker the most",
    usage: "<sticker>",
    execute: makeLeaderboard(ExpressionUsageType.MESSAGE, ExpressionType.STICKER),
});
