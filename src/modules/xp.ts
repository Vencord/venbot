import type { Message } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";
import { getLevelForXp, getXpForMessage, setXpForUser } from "~/util/xpMath";
const cooldowns: Record<string, number> = {};

async function updateXpForMessage(msg: Message): Promise<number> {
    const gainedXp = getXpForMessage(msg);
    const currentXp = await setXpForUser(msg.author.id, gainedXp);
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
