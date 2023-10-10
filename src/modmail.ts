import { ButtonStyles, ChannelTypes, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, TextChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { defineCommand } from "./Command";

const INTERACTION_ID = "modmail:open_ticket";
const MODMAIL_CATEGORY_ID = "1161415408012775595";

type GuildButtonInteraction = ComponentInteraction<ComponentTypes.BUTTON, TextChannel>;

defineCommand({
    name: "modmail:postMessage",
    ownerOnly: true,
    execute() {
        return Vaius.rest.channels.createMessage("1161412933050437682", {
            embeds: [{
                title: "Get in touch",
                description: "Got a question or problem regarding this server? Get in touch with our moderators by opening a ticket!\n\n# WARNING\nThis form is NOT FOR VENCORD SUPPORT. To get Vencord support, use <#1026515880080842772>.",
            }],
            components: [{
                type: ComponentTypes.ACTION_ROW,
                components: [{
                    type: ComponentTypes.BUTTON,
                    label: "Open a ticket",
                    style: ButtonStyles.PRIMARY,
                    customID: INTERACTION_ID,
                    emoji: {
                        name: "📩"
                    }
                }]
            }]
        });
    }
});

function getCategory() {
    const c = Vaius.getChannel(MODMAIL_CATEGORY_ID);
    if (!c) throw new Error("Modmail category not found");
    if (c.type !== ChannelTypes.GUILD_CATEGORY) throw new Error("Modmail category is not a category");

    return c;
}

async function createModmail(interaction: GuildButtonInteraction) {
    const cat = getCategory();

    const existingChannel = interaction.guild.channels.find(c => c.name === interaction.user.id);
    if (existingChannel) {
        return interaction.createMessage({
            content: `You already have a modmail ticket open: ${existingChannel.mention}`,
            flags: MessageFlags.EPHEMERAL
        });
    }

    await interaction.defer(MessageFlags.EPHEMERAL);

    const chan = await interaction.guild.createChannel(ChannelTypes.GUILD_TEXT, {
        parentID: cat.id,
        name: interaction.user.id,
    });

    chan.createMessage({
        content: `👋 ${interaction.user.mention}\n\nPlease describe your issue in as much detail as possible. A moderator will be with you shortly.`,
        components: [{
            type: ComponentTypes.ACTION_ROW,
            components: [{
                type: ComponentTypes.BUTTON,
                label: "Close ticket",
                style: ButtonStyles.DANGER,
                customID: `modmail:close:${chan.id}`,
                emoji: {
                    name: "📩"
                }
            }]
        }],
        allowedMentions: {
            users: [interaction.user.id]
        }
    });

    interaction.createFollowup({
        content: `📩 👉 ${chan.mention}.`,
        flags: MessageFlags.EPHEMERAL
    });
}

async function closeModmail(interaction: GuildButtonInteraction) {
    const chanId = interaction.data.customID.split(":")[2];

    await interaction.client.rest.channels.delete(chanId);
}

Vaius.on("interactionCreate", async interaction => {
    if (interaction.type !== InteractionTypes.MESSAGE_COMPONENT || !interaction.guild) return;

    if (interaction.data.customID === INTERACTION_ID)
        createModmail(interaction as GuildButtonInteraction);
    else if (interaction.data.customID.startsWith("modmail:close:"))
        closeModmail(interaction as GuildButtonInteraction);
});

