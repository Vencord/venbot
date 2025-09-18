import { Expressions, ExpressionUses } from "kysely-codegen";
import { AnyTextableGuildChannel, GuildEmoji, Member, PartialEmoji, PossiblyUncachedMessage, StickerFormatTypes, StickerItem, Uncached, User } from "oceanic.js";

import { Vaius } from "~/Client";
import Config from "~/config";
import { Millis } from "~/constants";
import { db, ExpressionFormatType, ExpressionType, ExpressionUsageType } from "~/db";
import { Deduper } from "~/util/Deduper";
import { getHomeGuild } from "~/util/discord";

const coolDowns = new Deduper<string>(Millis.MINUTE);

export const customEmojiRe = /<a?:\w+:(\d+)>/g;
const unicodeEmojiRe = /\p{RGI_Emoji}/vg;

const ExpressionFormatTypes = {
    [StickerFormatTypes.PNG]: ExpressionFormatType.PNG,
    [StickerFormatTypes.APNG]: ExpressionFormatType.APNG,
    [StickerFormatTypes.GIF]: ExpressionFormatType.GIF,
    [StickerFormatTypes.LOTTIE]: ExpressionFormatType.LOTTIE,
};

interface Row {
    expression: Expressions;
    expressionUsed: ExpressionUses;
}

function buildStickerRow(messageId: string, userId: string, usageType: ExpressionUsageType, { id, format_type, name }: StickerItem): Row | undefined {
    if (coolDowns.getOrAdd(`${userId}-${id}`)) return;

    return {
        expression: {
            id,
            name,
            formatType: ExpressionFormatTypes[format_type]
        },
        expressionUsed: {
            expressionType: ExpressionType.STICKER,
            usageType,
            id,
            messageId,
            userId
        }
    };
}

function buildCustomEmojiRow(messageId: string, userId: string, usageType: ExpressionUsageType, { name, animated, id }: GuildEmoji): Row | undefined {
    if (coolDowns.getOrAdd(`${userId}-${id}`)) return;

    return {
        expression: {
            id,
            name,
            formatType: animated ? ExpressionFormatType.GIF : ExpressionFormatType.PNG
        },
        expressionUsed: {
            expressionType: ExpressionType.EMOJI,
            usageType,
            id,
            messageId,
            userId
        }
    };
}

function buildUnicodeEmojiRow(messageId: string, userId: string, usageType: ExpressionUsageType, emoji: string): Row | undefined {
    if (coolDowns.getOrAdd(`${userId}-${emoji}`)) return;

    return {
        expression: {
            id: emoji,
            name: emoji,
            formatType: ExpressionFormatType.PNG
        },
        expressionUsed: {
            expressionType: ExpressionType.EMOJI,
            usageType,
            id: emoji,
            messageId,
            userId
        }
    };
}

function insertRows(rows: Row[]) {
    if (!rows.length || rows.length > 5) return;

    db.transaction().execute(async t => {
        const expressions = rows.map(r => r.expression);
        const expressionUses = rows.map(r => r.expressionUsed);

        await t
            .insertInto("expressions")
            .values(expressions)
            .onConflict(oc => oc
                .column("id")
                .doUpdateSet(eb => ({
                    name: eb.ref("excluded.name")
                }))
            )
            .execute();

        await t
            .insertInto("expressionUses")
            .values(expressionUses)
            .execute();
    });
}

Vaius.on("messageCreate", msg => {
    if (msg.author.bot || msg.guildID !== Config.homeGuildId || !msg.inCachedGuildChannel()) return;

    const msgId = msg.id;
    const userId = msg.author.id;

    const rows = [] as Row[];
    const seen = new Deduper<string>();

    msg.stickerItems?.forEach(({ id, format_type, name }) => {
        if (!msg.guild.stickers.has(id)) return;
        const row = buildStickerRow(msgId, userId, ExpressionUsageType.MESSAGE, { id, format_type, name });
        if (row) rows.push(row);
    });

    for (const [, id] of msg.content.matchAll(customEmojiRe)) {
        if (seen.getOrAdd(id)) continue;

        const emoji = msg.guild.emojis.get(id);
        if (!emoji) continue;

        const row = buildCustomEmojiRow(msgId, userId, ExpressionUsageType.MESSAGE, emoji);
        if (row) rows.push(row);
    }

    for (const [emoji] of msg.content.matchAll(unicodeEmojiRe)) {
        if (seen.getOrAdd(emoji)) continue;

        const row = buildUnicodeEmojiRow(msgId, userId, ExpressionUsageType.MESSAGE, emoji);
        if (row) rows.push(row);
    }

    if (!rows.length || rows.length > 10) return;

    insertRows(rows);
});

function shouldHandleReactionEvent(msg: PossiblyUncachedMessage, emoji?: PartialEmoji, user?: Uncached | User | Member) {
    const guildId = msg.guildID || (Vaius.getChannel(msg.channelID) as AnyTextableGuildChannel)?.guildID;
    if (guildId !== Config.homeGuildId) return false;

    if (emoji?.id) {
        if (!getHomeGuild()?.emojis.has(emoji.id))
            return false;
    }

    if (!user) return true;

    return ("bot" in user) && !user.bot;
}

Vaius.on("messageReactionAdd", async (msg, user, { emoji }) => {
    if (!shouldHandleReactionEvent(msg, emoji, user)) return;

    const row = emoji.id
        ? buildCustomEmojiRow(msg.id, user.id, ExpressionUsageType.REACTION, emoji as GuildEmoji)
        : buildUnicodeEmojiRow(msg.id, user.id, ExpressionUsageType.REACTION, emoji.name);

    if (row) insertRows([row]);
});

Vaius.on("messageReactionRemove", async (msg, user, { emoji }) => {
    if (!shouldHandleReactionEvent(msg, emoji, user)) return;

    db
        .deleteFrom("expressionUses")
        .where(eb => eb.and({
            userId: user.id,
            messageId: msg.id,
            id: emoji.id || emoji.name,
            usageType: ExpressionUsageType.REACTION
        }))
        .execute();
});

Vaius.on("messageReactionRemoveAll", msg => {
    if (!shouldHandleReactionEvent(msg)) return;

    db
        .deleteFrom("expressionUses")
        .where(eb => eb.and({
            messageId: msg.id,
            usageType: ExpressionUsageType.REACTION
        }))
        .execute();
});

Vaius.on("messageReactionRemoveEmoji", (msg, emoji) => {
    if (!shouldHandleReactionEvent(msg, emoji)) return;

    db
        .deleteFrom("expressionUses")
        .where(eb => eb.and({
            messageId: msg.id,
            id: emoji.id || emoji.name,
            usageType: ExpressionUsageType.REACTION
        }))
        .execute();
});
