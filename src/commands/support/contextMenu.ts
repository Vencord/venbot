import { ApplicationCommandTypes, ComponentTypes, MessageFlags, TextChannel } from "oceanic.js";

import { Vaius } from "~/Client";
import { PROD } from "~/constants";

import { buildFaqEmbed, fetchFaq } from "./faq";
import { SupportInstructions, SupportTagList } from "./support";

const GUILD_ID = PROD
    ? "1015060230222131221"
    : "1240028478498144257";

const enum Commands {
    Support = "send support tag",
    Faq = "send faq tag"
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

Vaius.on("interactionCreate", async interaction => {
    if (interaction.isCommandInteraction() && interaction.isMessageCommand()) {
        const { name } = interaction.data;
        if (name === Commands.Support || name === Commands.Faq) {
            let options: string[];
            let method: "createMessage" | "createFollowup" = "createMessage";
            if (name === Commands.Support) {
                options = SupportTagList.map(tags => tags[0]);
            } else {
                const [_, faqs] = await Promise.all([interaction.defer(MessageFlags.EPHEMERAL), fetchFaq()]);
                options = faqs.map(f => f.question);
                method = "createFollowup";
            }

            await interaction[method]({
                flags: MessageFlags.EPHEMERAL,
                components: [{
                    type: ComponentTypes.ACTION_ROW,
                    components: [{
                        type: ComponentTypes.STRING_SELECT,
                        customID: `${name} selection ${interaction.data.targetID}`,
                        options: options.map(o => ({ label: o, value: o }))
                    }]
                }]
            });
        }
    }

    if (
        interaction.isComponentInteraction() &&
        interaction.data.componentType === ComponentTypes.STRING_SELECT &&
        interaction.channel instanceof TextChannel
    ) {
        const [command, targetId] = interaction.data.customID.split(" selection ");
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
                        content: SupportInstructions[choice]
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
