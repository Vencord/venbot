
import { Vaius } from "~/Client";
import { defineCommand } from "~/Command";
import { db, ExpressionType } from "~/db";
import { GUILD_ID } from "~/env";
import { reply, ZWSP } from "~/util";
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
                    ? `[${toInlineCode(`:${e.name}:`)}](https://cdn.discordapp.com/emojis/${e.id}.${e.formatType})`
                    : `<${isAnimated ? "a" : ""}:${e.name}:${e.id}>`;

            return [e.count.toString(), namePart];
        });

    const longestCountString = data.reduce((length, [count]) => Math.max(length, count.length), 0);

    return data
        .map(([count, name]) =>
            `\`${count.padStart(longestCountString, " ")}\`${THREE_SPACES_FUCK_YOU_DISCORD_WHY_WOULD_YOU_MERGE_MULTIPLE_SPACES}${name}`
        )
        .join("\n");
}

function renderStickers(stickers: Expression[]) {
    const guildStickers = Vaius.guilds.get(GUILD_ID)!.stickers;

    return "";
}

defineCommand({
    name: "stats",
    description: "Get stats about most used emojis or stickers",
    usage: `<${ExpressionTypes.join(" | ")}>`,
    async execute(msg, type: ExpressionType) {
        if (!ExpressionTypes.includes(type))
            return reply(msg, `Invalid type. Must be one of: ${ExpressionTypes.map(toInlineCode).join(", ")}`);

        const stats = await db
            .selectFrom("expressionUses")
            .innerJoin("expressions", "expressions.id", "expressionUses.id")
            .select(({ fn }) => [
                "expressions.id",
                "expressions.name",
                "expressions.formatType",
                fn.countAll().as("count")
            ])
            .where("expressionType", "=", type)
            .groupBy("expressions.id")
            .orderBy("count", "desc")
            .execute();

        const render = type === ExpressionType.EMOJI ? renderEmojis : renderStickers;

        const paginator = new Paginator(
            toTitle(`${type} Stats`),
            stats,
            20,
            render,
            `${stats.length} ${type}s tracked`
        );

        await paginator.create(msg);
    },
});
