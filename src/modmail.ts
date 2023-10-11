import { createHash } from "crypto";
import { ActivityTypes, ApplicationCommandTypes, ButtonStyles, ChannelTypes, CommandInteraction, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, TextChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { defineCommand } from "./Command";
import { MOD_ROLE_ID } from "./constants";

const INTERACTION_ID = "modmail:open_ticket";
const THREAD_PARENT_ID = "1161412933050437682";
const LOG_CHANNEL_ID = "1161449871182659655";

type GuildInteraction = ComponentInteraction<ComponentTypes.BUTTON, TextChannel> | CommandInteraction<TextChannel>;

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

async function log(content: string) {
    return Vaius.rest.channels.createMessage(LOG_CHANNEL_ID, {
        content
    });
}

function getThreadParent() {
    const c = Vaius.getChannel(THREAD_PARENT_ID);
    if (!c) throw new Error("Modmail category not found");

    return c as TextChannel;
}

const getTicketId = (userId: string) => createHash("sha1").update(`${process.env.MODMAIL_HASH_SALT || ""}:${userId}`).digest("hex");
async function createModmail(interaction: GuildInteraction) {
    const threadParent = getThreadParent();

    const ticketId = getTicketId(interaction.user.id);

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

    const msg = await thread.createMessage({
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


    await msg.edit({
        allowedMentions: {
            roles: [MOD_ROLE_ID],
        },
        content: msg.content.replace("moderator", `<@&${MOD_ROLE_ID}>`)
    });

    await interaction.createFollowup({
        content: `📩 👉 ${thread.mention}.`,
        flags: MessageFlags.EPHEMERAL
    });

    await log(`${interaction.user.mention} opened ticket ${thread.name} - ${thread.mention}`);
}

async function closeModmail(interaction: GuildInteraction) {
    if (!interaction.member.permissions.has("MANAGE_CHANNELS") && interaction.channel.name !== getTicketId(interaction.user.id))
        return;

    await interaction.channel.delete();

    await log(`${interaction.user.mention} closed ticket ${interaction.channel.name}`);
}

Vaius.on("interactionCreate", async interaction => {
    if (!interaction.guild) return;

    if (interaction.type === InteractionTypes.APPLICATION_COMMAND && interaction.data.name === "modmail")
        return createModmail(interaction as GuildInteraction);

    if (interaction.type !== InteractionTypes.MESSAGE_COMPONENT) return;

    if (interaction.data.customID === INTERACTION_ID)
        createModmail(interaction as GuildInteraction);
    else if (interaction.data.customID.startsWith("modmail:close:"))
        closeModmail(interaction as GuildInteraction);
});


Vaius.once("ready", () => {
    Vaius.editStatus("online", [{
        type: ActivityTypes.LISTENING,
        name: "/modmail"
    }]);

    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: "modmail",
        description: "Open a modmail ticket",
    });
});
