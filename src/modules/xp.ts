import type { Message } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";
import { db } from "~/db";
import { getLevelForXp, getXpForMessage } from "~/util/xpMath";

const cooldowns: Record<string, number> = {};

async function updateXpForMessage(msg: Message): Promise<number> {
    const gainedXp = getXpForMessage(msg);

    const currentXp = await db.selectFrom("userXpLevel")
        .select("xp")
        .where("userId", "=", msg.author.id)
        .executeTakeFirst() ?? { xp: 0 };

    const newXp = currentXp.xp + gainedXp;

    await db.insertInto("userXpLevel")
        .values({ userId: msg.author.id, xp: newXp })
        .onConflict(oc => oc.column("userId").doUpdateSet({ xp: newXp }))
        .execute();

    const newLevel = getLevelForXp(newXp);

    return newLevel;
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

    const newLevel = await updateXpForMessage(msg);

    for (const [level, roleId] of Object.entries(Config.xp.rewards)
        .sort(([a], [b]) => Number(a) - Number(b))) {

        const requiredLevel = Number(level);

        if (requiredLevel > newLevel) break;
        if (msg.member.roles.includes(roleId)) continue;

        await msg.member.addRole(roleId, "level up!");
    }
});
