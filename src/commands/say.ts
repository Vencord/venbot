import { ApplicationCommandOptionTypes, ApplicationCommandTypes, InteractionTypes, MessageFlags } from "oceanic.js";

import { OwnerId, Vaius } from "../Client";

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: "say",
        description: "say",
        defaultMemberPermissions: "0",
        options: [{
            name: "content",
            description: "content",
            type: ApplicationCommandOptionTypes.STRING,
            required: true
        }]
    });
});

Vaius.on("interactionCreate", async i => {
    if (i.user.id !== OwnerId) return;
    if (i.type !== InteractionTypes.APPLICATION_COMMAND || i.data.name !== "say") return;
    if (!i.inCachedGuildChannel()) return;

    const content = i.data.options.getString("content", true);

    await i.defer(MessageFlags.EPHEMERAL);

    await i.channel.createMessage({ content });
    await i.createFollowup({ content: "done", flags: MessageFlags.EPHEMERAL });
});
