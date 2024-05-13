import { Vaius } from "../Client";

const HuskAbuserIds = new Set([
    "886685857560539176", // nino
    "259558259491340288", // sqakoi
]);

Vaius.on("messageReactionAdd", async (msg, reactor, reaction) => {
    if (!msg.guildID) return;
    if (reaction.name.toLowerCase().includes("husk")) return;

    if (HuskAbuserIds.has(reactor.id)) {
        await Vaius.rest.channels.deleteReaction(msg.channelID, msg.id, `husk:${reaction.id}`, reactor.id);
    }
});
