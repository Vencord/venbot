import { Vaius } from "~/Client";
import { defineCommand } from "~/Command";
import { db, ExpressionFormatType, ExpressionType } from "~/db";
import { GUILD_ID } from "~/env";
import { reply } from "~/util";
import { makeConstants } from "~/util/objects";
import { Paginator } from "~/util/Paginator";
import { toInlineCode, toTitle } from "~/util/text";

import { formatCountAndName } from "./shared";

const ExpressionTypes = [ExpressionType.EMOJI, ExpressionType.STICKER];

interface Expression {
    id: string;
    formatType: string;
    name: string;
    count: string | number | bigint;
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

