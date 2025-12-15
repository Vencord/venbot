import { ApplicationCommandOptionTypes, CreateMessageOptions, MessageFlags } from "oceanic.js";

import { Vaius } from "~/Client";
import { registerChatInputCommand } from "~/SlashCommands";

registerChatInputCommand(
    {
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
    },
    {
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
    }
);

