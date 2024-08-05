import { AnyTextableChannel, ApplicationCommandTypes, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, SelectMenuTypes } from "oceanic.js";

import { Vaius } from "~/Client";
import { GUILD_ID } from "~/env";
import { handleCommandInteraction, handleInteraction } from "~/SlashCommands";

import { buildFaqEmbed, fetchFaq } from "./faq";
import { SupportInstructions, SupportTagList } from "./support";

const enum Commands {
    Support = "Send Support Tag",
    Faq = "Send FAQ Tag"
}

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand(GUILD_ID, {
        type: ApplicationCommandTypes.MESSAGE,
        name: Commands.Support
    });

    Vaius.application.createGuildCommand(GUILD_ID, {
        type: ApplicationCommandTypes.MESSAGE,
        name: Commands.Faq
    });
});

handleCommandInteraction(
    Commands.Support,
    async interaction => {
        const options = SupportTagList.map(tags => ({
            value: tags[0],
            label: tags[0],
            emoji: { name: SupportInstructions[tags[0]].emoji }
        }));

        await interaction.createMessage({
            flags: MessageFlags.EPHEMERAL,
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [{
                    type: ComponentTypes.STRING_SELECT,
                    customID: `${Commands.Support}:${interaction.data.targetID}`,
                    options
                }]
            }]
        });
    }
);

handleCommandInteraction(
    Commands.Faq,
    async interaction => {
        const [_, faqs] = await Promise.all([interaction.defer(MessageFlags.EPHEMERAL), fetchFaq()]);
        const options = faqs.map(f => ({
            value: f.question,
            label: f.question
        }));

        await interaction.createFollowup({
            flags: MessageFlags.EPHEMERAL,
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [{
                    type: ComponentTypes.STRING_SELECT,
                    customID: `${Commands.Faq}:${interaction.data.targetID}`,
                    options
                }]
            }]
        });
    }
);

handleInteraction(InteractionTypes.MESSAGE_COMPONENT, {
    isMatch: i =>
        i.data.componentType === ComponentTypes.STRING_SELECT && (
            i.data.customID.startsWith(Commands.Support + ":") ||
            i.data.customID.startsWith(Commands.Faq + ":")
        ),
    async handle(interaction: ComponentInteraction<SelectMenuTypes, AnyTextableChannel>) {
        const [command, targetId] = interaction.data.customID.split(":");
        if (!command || !targetId) return;

        const choice = interaction.data.values.getStrings()[0];

        const defer = interaction.defer(MessageFlags.EPHEMERAL);

        const replyOptions = {
            messageReference: { messageID: targetId },
            allowedMentions: { repliedUser: true }
        };

        const FOLLOWUP_OKAY = "Sent!";
        let followUp = FOLLOWUP_OKAY;
        try {
            switch (command) {
                case Commands.Support:
                    await interaction.channel.createMessage({
                        ...replyOptions,
                        content: SupportInstructions[choice].content + `\n\n(Auto-response invoked by ${interaction.user.mention})`
                    });
                    await defer;
                    break;
                case Commands.Faq:
                    const faq = await fetchFaq().then(faqs => faqs.find(f => f.question === choice));
                    if (!faq)
                        throw new Error("Unmatched faq question: " + choice);

                    await interaction.channel.createMessage({
                        ...replyOptions,
                        embeds: [buildFaqEmbed(faq, interaction.user)],
                    });
                    break;
                default:
                    followUp = "tf did u do";
                    break;
            }

        } catch (e) {
            followUp = "Something exploded :(";
            throw e;
        } finally {
            await interaction.deleteFollowup(interaction.message.id);
            await defer;
            const res = await interaction.createFollowup({ content: followUp, flags: MessageFlags.EPHEMERAL });
            if (followUp === FOLLOWUP_OKAY)
                await res.deleteMessage();
        }
    }
});
