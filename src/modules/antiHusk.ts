
import { Millis } from "~/constants";

import { Vaius } from "../Client";

const MaxAllowedHusksPerHour = 4;

const HuskAbuserIds = new Set([
    "886685857560539176", // nino
    "259558259491340288", // sqakoi
]);

const HusksUsedPerUser = new Map<string, number>();

Vaius.on("messageReactionAdd", async (msg, reactor, reaction) => {
    if (!msg.guildID) return;
    if (!HuskAbuserIds.has(reactor.id)) return;
    if (!reaction.name.toLowerCase().includes("husk")) return;

    const husksUsed = HusksUsedPerUser.get(reactor.id) ?? 0;

    if (husksUsed >= MaxAllowedHusksPerHour) {
        await Vaius.rest.channels.deleteReaction(msg.channelID, msg.id, `${reaction.name}:${reaction.id}`, reactor.id);
        return;
    }

    HusksUsedPerUser.set(reactor.id, husksUsed + 1);
});

const millisToNextFullHour = () => Millis.HOUR - (Date.now() % Millis.HOUR);

setTimeout(function resetHusksUsed() {
    HusksUsedPerUser.clear();
    setTimeout(resetHusksUsed, millisToNextFullHour());
}, millisToNextFullHour());
