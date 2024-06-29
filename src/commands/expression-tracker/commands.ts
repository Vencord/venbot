
import { defineCommand } from "~/Command";
import { db, ExpressionType } from "~/db";
import { reply } from "~/util";
import { Paginator } from "~/util/Paginator";
import { toInlineCode } from "~/util/text";

const ExpressionTypes = [ExpressionType.EMOJI, ExpressionType.STICKER];

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
            .execute();

        console.log(stats.map(s => s.name));
        const paginator = new Paginator(
            `${type} stats`,
            stats,
            2,
            data => {
                return data.map(d => d.name).join("\n");
            }
        );

        await paginator.create(msg);
    },
});
