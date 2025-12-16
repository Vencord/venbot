import { User } from "oceanic.js";

import { CommandContext, defineCommand } from "~/Commands";
import { db, ExpressionFormatType, ExpressionType, ExpressionUsageType } from "~/db";
import { Paginator } from "~/util/Paginator";
import { resolveUser } from "~/util/resolvers";
import { toInlineCode, toTitle } from "~/util/text";

import { getHomeGuild } from "~/util/discord";
import { formatCountAndName } from "./shared";

const ExpressionTypes = [ExpressionType.EMOJI, ExpressionType.STICKER];

interface Expression {
    id: string;
    formatType: string;
    name: string;
    count: string | number | bigint;
}

function renderEmojis(emojis: Expression[]) {
    const guildEmojis = getHomeGuild()!.emojis;

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

async function createTop({ msg, reply }: CommandContext, user: User | null, noDeleted: boolean, expressionType: ExpressionType, usageType = ExpressionUsageType.MESSAGE) {
    let builder = db
        .selectFrom("expressionUses")
        .innerJoin("expressions", "expressions.id", "expressionUses.id")
        .select(({ fn }) => [
            "expressions.id",
            "expressions.name",
            "expressions.formatType",
            fn.countAll().as("count"),
            fn.sum(fn.countAll()).over().as("totalCount")
        ])
        .where(eb => eb.and({
            expressionType,
            usageType
        }))
        .groupBy("expressions.id")
        .orderBy("count", "desc");

    if (user)
        builder = builder.where("userId", "=", user.id);

    let stats = await builder.execute();

    const name = usageType === ExpressionUsageType.REACTION ? "reaction" : expressionType;

    if (noDeleted && msg.guild) {
        const expressions = expressionType === ExpressionType.EMOJI
            ? msg.guild.emojis
            : msg.guild.stickers;

        stats = stats.filter(s => expressions.has(s.id));
    }

    if (!stats.length)
        return reply(`No ${name}s have been tracked yet! D:`);

    const render = expressionType === ExpressionType.EMOJI ? renderEmojis : renderStickers;
    const title = `${user ? `${toTitle(user.tag)}'s Top` : "Top"} ${toTitle(name)}s`;

    const paginator = new Paginator(
        title,
        stats,
        20,
        render,
        `${stats.length} ${name}s tracked  •  ${stats[0].totalCount} uses`
    );

    await paginator.create(msg);
}

const makeTop = (isUserMode: boolean) => async (ctx: CommandContext, type?: string, arg1?: string, arg2?: string) => {
    const { msg, reply } = ctx;

    type ||= "emojis";
    type = type.toLowerCase();

    if (arg1 === "--no-deleted") {
        ([arg1, arg2] = [arg2, arg1]);
    }

    const userInput = arg1;
    const noDeleted = arg2 === "--no-deleted";

    let user = isUserMode ? msg.author : null;
    if (isUserMode && userInput) {
        user = await resolveUser(userInput);
        if (!user)
            return reply(`Invalid user ${toInlineCode(userInput)}`);
    }

    if ("emojis".startsWith(type) || "emotes".startsWith(type))
        return createTop(ctx, user, noDeleted, ExpressionType.EMOJI);

    if ("stickers".startsWith(type))
        return createTop(ctx, user, noDeleted, ExpressionType.STICKER);

    if ("reactions".startsWith(type))
        return createTop(ctx, user, noDeleted, ExpressionType.EMOJI, ExpressionUsageType.REACTION);

    return reply("Invalid type. Must be one of: `emojis`, `stickers`, `reactions`");
};

defineCommand({
    name: "top",
    description: "Get stats about most used emojis or stickers",
    usage: "<emojis | stickers | reactions> [--no-deleted]",
    execute: makeTop(false),
});

defineCommand({
    name: "mytop",
    aliases: ["myt", "myst", "mystats"],
    description: "Get stats about your most used emojis or stickers",
    usage: "<emojis | stickers | reactions> [user] [--no-deleted]",
    execute: makeTop(true),
});
