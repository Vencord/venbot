import { Message } from "oceanic.js";
import { db } from "~/db";

export function getXpForLevel(level: number): number {
    return Math.ceil((5 / 2) * (-1 + 20 * Math.pow(level, 2)));
}

export function getLevelForXp(xp: number): number {
    return Math.floor(Math.sqrt(2 * xp + 5) / 10);
}

export function getRequiredXpForNextLevel(xp: number): number {
    return getXpForLevel(getLevelForXp(xp) + 1);
}

export function getXpForMessage(message: Message) {
    return Math.min(Math.ceil((message.content.length / 10) ** 2), 30);
}

export async function getXpForUser(userId: string) {
    return await db.selectFrom("userXpLevel")
        .selectAll()
        .where("userId", "=", userId)
        .executeTakeFirst() ?? { xp: 0 };
}

export async function setXpForUser(userId: string, xp: number): Promise<number> {
    const currentXp = await getXpForUser(userId);
    const newXp = currentXp.xp + xp;

    await db.insertInto("userXpLevel")
        .values({ userId, xp: newXp })
        .onConflict(oc => oc.column("userId").doUpdateSet({ xp: newXp }))
        .execute();

    return newXp;
}
