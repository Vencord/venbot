import { User } from "oceanic.js";
import { Vaius } from "~/Client";
import { db } from "~/db";
import { fetchBuffer } from "~/util/fetch";
import { emojiCache, getEmojiData, uploadEmoji } from "./emojiManager";

const getEmojiName = (user: User) => `av${user.id}`;

async function uploadUserEmoji(user: User) {
    const oldEmoji = emojiCache.get(getEmojiName(user));
    if (oldEmoji) await Vaius.application.deleteEmoji(oldEmoji.id);

    const emoji = await uploadEmoji(
        getEmojiName(user),
        await fetchBuffer(user.avatarURL(user.avatar!.startsWith("a_") ? "gif" : "jpeg", 128))
    );

    await db
        .insertInto("userAvatarEmojis")
        .values({
            userId: user.id,
            avatarHash: user.avatar!,
            emojiId: emoji.id
        })
        .onConflict(oc => oc.column("userId").doUpdateSet({ avatarHash: user.avatar!, emojiId: emoji.id }))
        .execute();

    return emoji;
}

export async function getUserEmojiData(user: User) {
    const { avatar, id, defaultAvatar } = user;

    if (!avatar)
        return getEmojiData(`avatar${defaultAvatar}`);

    const data = await db.selectFrom("userAvatarEmojis")
        .where("userId", "=", id)
        .select(["emojiId", "avatarHash"])
        .executeTakeFirst();

    return data?.avatarHash === avatar
        ? getEmojiData(getEmojiName(user))
        : await uploadUserEmoji(user);
}

export async function getUserEmoji(user: User) {
    const e = await getUserEmojiData(user);

    return e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
}
