import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ApplicationIntegrationTypes, CreateMessageOptions, InteractionContextTypes, MessageFlags } from "oceanic.js";

import { Vaius } from "~/Client";
import { GUILD_ID } from "~/env";
import { handleCommandInteraction } from "~/SlashCommands";

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand(GUILD_ID, {
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
        contexts: [InteractionContextTypes.BOT_DM, InteractionContextTypes.GUILD, InteractionContextTypes.PRIVATE_CHANNEL],
        name: "say",
        description: "say",
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

handleCommandInteraction({
    name: "say",
    ownerOnly: true,
    async handle(i) {
        const content = i.data.options.getString("content", true);
        const reply = i.data.options.getString("reply-to");

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
            await i.reply({ content: "done", flags: MessageFlags.EPHEMERAL });
        } catch {
            await i.createMessage(data);
        }
    }
});
