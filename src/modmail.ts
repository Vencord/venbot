import { createHash } from "crypto";
import { ActivityTypes, ApplicationCommandTypes, ButtonStyles, ChannelTypes, CommandInteraction, ComponentInteraction, ComponentTypes, GuildComponentSelectMenuInteraction, InteractionTypes, MessageFlags, TextChannel } from "oceanic.js";

import { Vaius } from "./Client";
import { defineCommand } from "./Command";
import { DEV_CHANNEL_ID, MOD_ROLE_ID, PROD, SUPPORT_CHANNEL_ID } from "./constants";

const enum Ids {
    OPEN_TICKET = "modmail:open_ticket",
    OPEN_CONFIRM = "modmail:open_confirm",
    REASON_MONKEY = "modmail:iamamonkey",
    REASON_MOD = "modmail:mod",
    REASON_DONOR = "modmail:donor"
}

const COMMAND_NAME = PROD ? "modmail" : "devmodmail";

const MODMAIL_BAN_ROLE_ID = "1161815552919076867";
const THREAD_PARENT_ID = PROD ? "1161412933050437682" : DEV_CHANNEL_ID;
const LOG_CHANNEL_ID = PROD ? "1161449871182659655" : DEV_CHANNEL_ID;

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
                    customID: Ids.OPEN_TICKET,
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

async function createModmailConfirm(interaction: GuildInteraction) {
    if (interaction.member.roles.includes(MODMAIL_BAN_ROLE_ID)) {
        return interaction.createMessage({
            content: "You are banned from using modmail.",
            flags: MessageFlags.EPHEMERAL
        });
    }

    interaction.createMessage({
        content: "Why are you creating this ticket?",
        flags: MessageFlags.EPHEMERAL,
        components: [{
            type: ComponentTypes.ACTION_ROW,
            components: [{
                type: ComponentTypes.STRING_SELECT,
                customID: "modmail:open_confirm",
                options: [
                    {
                        label: "I need help with Vencord",
                        value: Ids.REASON_MONKEY + 1
                    },
                    {
                        label: "I want to ask a question about Vencord",
                        value: Ids.REASON_MONKEY + 2
                    },
                    {
                        label: "I donated and want to redeem my rewards",
                        value: Ids.REASON_DONOR
                    },
                    {
                        label: "I need to talk to a moderator",
                        value: Ids.REASON_MOD
                    },
                    {
                        label: "I just want to test modmail",
                        value: Ids.REASON_MONKEY + 3
                    },
                ]
            }]
        }]
    });
}

async function onModmailConfirm(interaction: GuildComponentSelectMenuInteraction) {
    const reason = interaction.data.values.getStrings()[0];
    if (reason.startsWith(Ids.REASON_MONKEY)) {
        return await interaction.createMessage({
            content: `This form is NOT FOR VENCORD SUPPORT OR TESTING. To get Vencord support, use <#${SUPPORT_CHANNEL_ID}>`,
            flags: MessageFlags.EPHEMERAL
        });
    }

    if (reason === Ids.REASON_DONOR) {
        return await interaction.createMessage({
            content: "Thanks a lot for donating! Please private message <@343383572805058560> to redeem your perks! Make sure you have your DMs open or it won't work.",
            flags: MessageFlags.EPHEMERAL
        });
    }

    createModmail(interaction as any as GuildInteraction);
}

async function closeModmail(interaction: GuildInteraction) {
    if (!interaction.member.permissions.has("MANAGE_CHANNELS") && interaction.channel.name !== getTicketId(interaction.user.id))
        return;

    await interaction.channel.delete();

    await log(`${interaction.user.mention} closed ticket ${interaction.channel.name}`);
}

Vaius.on("interactionCreate", async interaction => {
    if (!interaction.guild) return;

    if (interaction.type === InteractionTypes.APPLICATION_COMMAND && interaction.data.name === COMMAND_NAME)
        return createModmailConfirm(interaction as GuildInteraction);

    if (interaction.type !== InteractionTypes.MESSAGE_COMPONENT) return;

    if (interaction.data.customID === Ids.OPEN_TICKET)
        createModmailConfirm(interaction as GuildInteraction);
    else if (interaction.data.customID === Ids.OPEN_CONFIRM)
        onModmailConfirm(interaction as GuildComponentSelectMenuInteraction);
    else if (interaction.data.customID.startsWith("modmail:close:"))
        closeModmail(interaction as GuildInteraction);
});



Vaius.once("ready", () => {
    if (PROD) {
        Vaius.editStatus("online", [{
            type: ActivityTypes.LISTENING,
            name: "/modmail"
        }]);
    }

    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: COMMAND_NAME,
        description: "Open a modmail ticket",
    });
});
