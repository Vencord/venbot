import { Message } from "oceanic.js";

import { hourly } from "~/util/hourly";

import { Vaius } from "../Client";

const MaxAllowedHusksPerHour = 4;

const HuskAbuserIds = new Set([
    "886685857560539176", // nino
    "259558259491340288", // sqakoi
]);

const HusksUsedPerUser = new Map<string, number>();

Vaius.on("messageReactionAdd", async (msg, reactor, { emoji }) => {
    if (!msg.guildID) return;
    if (!HuskAbuserIds.has(reactor.id)) return;
    if (!emoji.name.toLowerCase().includes("husk")) return;

    if (msg instanceof Message) {
        const existingReactions = msg.reactions.find(r => r.emoji.id === emoji.id);
        if (existingReactions?.count! >= 3) // if 2 other people reacted, it means this husk is probably a no-brainer so don't count
            return;
    }

    const husksUsed = HusksUsedPerUser.get(reactor.id) ?? 0;

    if (husksUsed >= MaxAllowedHusksPerHour) {
        await Vaius.rest.channels.deleteReaction(msg.channelID, msg.id, `${emoji.name}:${emoji.id}`, reactor.id);
        return;
    }

    HusksUsedPerUser.set(reactor.id, husksUsed + 1);
});

hourly(() => HusksUsedPerUser.clear());
