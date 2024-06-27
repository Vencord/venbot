import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ApplicationIntegrationTypes, CreateMessageOptions, InteractionTypes, MessageFlags } from "oceanic.js";

import { OwnerId, Vaius } from "~/Client";

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: "say",
        description: "say",
        defaultMemberPermissions: "0",
        options: [
            {
                name: "content",
                description: "content",
                type: ApplicationCommandOptionTypes.STRING,
                required: true
            },
            {
                name: "reply-to",
                description: "reply",
                type: ApplicationCommandOptionTypes.STRING,
                required: false
            }
        ]
    });

    Vaius.application.createGlobalCommand({
        integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: "say",
        description: "say",
        defaultMemberPermissions: "0",
        options: [
            {
                name: "content",
                description: "content",
                type: ApplicationCommandOptionTypes.STRING,
                required: true
            },
            {
                name: "reply-to",
                description: "reply",
                type: ApplicationCommandOptionTypes.STRING,
                required: false
            }
        ]
    });
});

Vaius.on("interactionCreate", async i => {
    if (i.user.id !== OwnerId) return;
    if (i.type !== InteractionTypes.APPLICATION_COMMAND || i.data.name !== "say") return;

    const content = i.data.options.getString("content", true);
    const reply = i.data.options.getString("reply-to");

    await i.defer(MessageFlags.EPHEMERAL);

    const data: CreateMessageOptions = {
        content,
        messageReference: reply ? {
            messageID: reply
        } : undefined,
        allowedMentions: {
            everyone: false,
            roles: false,
            repliedUser: true,
            users: true
        }
    };

    try {
        await Vaius.rest.channels.createMessage(i.channelID, data);
        await i.createFollowup({ content: "done", flags: MessageFlags.EPHEMERAL });
    } catch {
        await i.createFollowup(data);
    }
});
