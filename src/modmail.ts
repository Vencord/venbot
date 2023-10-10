import { createHash } from "crypto";
import { ButtonStyles, ChannelTypes, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, TextChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { defineCommand } from "./Command";
import { MOD_LOG_CHANNEL_ID } from "./constants";

const INTERACTION_ID = "modmail:open_ticket";
const THREAD_PARENT_ID = "1161412933050437682";

type GuildButtonInteraction = ComponentInteraction<ComponentTypes.BUTTON, TextChannel>;

defineCommand({
    name: "modmail:post",
    ownerOnly: true,
    execute() {
        return Vaius.rest.channels.createMessage(THREAD_PARENT_ID, {
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

function getThreadParent() {
    const c = Vaius.getChannel(THREAD_PARENT_ID);
    if (!c) throw new Error("Modmail category not found");

    return c as TextChannel;
}

async function createModmail(interaction: GuildButtonInteraction) {
    const threadParent = getThreadParent();

    const ticketId = createHash("sha1").update(`${process.env.MODMAIL_HASH_SALT || ""}:${interaction.user.id}`).digest("hex");

    const existingChannel = threadParent.threads.find(t => t.name === ticketId);
    if (existingChannel) {
        return interaction.createMessage({
            content: `You already have a modmail ticket open: ${existingChannel.mention}`,
            flags: MessageFlags.EPHEMERAL
        });
    }

    await interaction.defer(MessageFlags.EPHEMERAL);

    const thread = await threadParent.startThreadWithoutMessage({
        type: ChannelTypes.PRIVATE_THREAD,
        name: ticketId,
        invitable: false
    });
    // FIXME: workaround for oceanic bug where newly created channels wont be cached. remove once fixed
    threadParent.threads.set(thread.id, thread);

    await thread.createMessage({
        content: `👋 ${interaction.user.mention}\n\nPlease describe your issue in as much detail as possible. A moderator will be with you shortly.`,
        components: [{
            type: ComponentTypes.ACTION_ROW,
            components: [{
                type: ComponentTypes.BUTTON,
                label: "Close ticket",
                style: ButtonStyles.DANGER,
                customID: `modmail:close:${thread.id}`,
                emoji: {
                    name: "📩"
                }
            }]
        }],
        allowedMentions: {
            users: [interaction.user.id]
        }
    });

    await interaction.createFollowup({
        content: `📩 👉 ${thread.mention}.`,
        flags: MessageFlags.EPHEMERAL
    });

    await Vaius.rest.channels.createMessage(MOD_LOG_CHANNEL_ID, { content: `📩 ${interaction.user.mention} opened a ticket: ${thread.mention}` });
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

