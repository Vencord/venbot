import type { Message, User } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";
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

export async function getXpForUser(user: User) {
    return await db.selectFrom("userXpLevel")
        .selectAll()
        .where("userId", "=", user.id)
        .executeTakeFirst() ?? { xp: 0 };
}

export async function setXpForUser(user: User, xp: number): Promise<number> {
    const result = await db
        .insertInto("userXpLevel")
        .values({
            userId: user.id,
            xp,
        })
        .onConflict((oc) =>
            oc.column("userId").doUpdateSet({
                xp: (eb) => eb("userXpLevel.xp", "+", xp),
            }),
        )
        .returning("xp")
        .executeTakeFirstOrThrow();

    return result.xp;
}

const cooldowns: Record<string, number> = {};

async function updateXpForMessage(msg: Message): Promise<number> {
    const gainedXp = getXpForMessage(msg);
    const currentXp = await setXpForUser(msg.author, gainedXp);
    const xpLevel = getLevelForXp(currentXp);
    return xpLevel;
}

Vaius.on("messageCreate", async msg => {
    if (!msg.inCachedGuildChannel()) return;
    if (msg.author.bot) return;
    // ignore non eligible categories
    if (!msg.channel.parentID || !Config.xp.eligibleCategories.includes(msg.channel.parentID)) return;
    // ignore messages with only images
    if (!msg.content) return;
    // ignore venbot commands
    if (Config.prefixes.some(prefix => msg.content.startsWith(prefix))) return;
    // cooldown of 2.5 minutes
    if (cooldowns[msg.author.id] > Date.now()) return;
    cooldowns[msg.author.id] = Date.now() + (2.5 * 60000);

    const currentLevel = await updateXpForMessage(msg);

    for (const [level, roleId] of Object.entries(Config.xp.rewards)
        .sort(([a], [b]) => Number(a) - Number(b))) {

        const requiredLevel = Number(level);

        if (requiredLevel > currentLevel) break;
        if (msg.member.roles.includes(roleId)) continue;

        await msg.member.addRole(roleId, "level up!");
    }
});
