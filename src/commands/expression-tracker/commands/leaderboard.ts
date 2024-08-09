import { Message } from "oceanic.js";

import { defineCommand } from "~/Command";
import { db, ExpressionType, ExpressionUsageType } from "~/db";
import { reply } from "~/util";
import { Paginator } from "~/util/Paginator";
import { toInlineCode, toTitle } from "~/util/text";

import { formatCountAndName } from "./shared";

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
