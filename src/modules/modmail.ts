import { ActivityTypes, AnyTextableGuildChannel, ApplicationCommandTypes, ButtonStyles, ChannelTypes, CommandInteraction, ComponentInteraction, ComponentTypes, GuildComponentInteraction, GuildComponentSelectMenuInteraction, InteractionTypes, MessageFlags, TextChannel } from "oceanic.js";

import { db } from "~/db";
import { sendDm } from "~/util";
import { stripIndent } from "~/util/text";

import { Vaius } from "../Client";
import { defineCommand } from "../Command";
import { DEV_CHANNEL_ID, Emoji, MOD_ROLE_ID, PROD, SUPPORT_CHANNEL_ID } from "../constants";

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

type GuildInteraction = ComponentInteraction<ComponentTypes.BUTTON, AnyTextableGuildChannel> | CommandInteraction<AnyTextableGuildChannel>;

defineCommand({
    name: "modmail:post",
    ownerOnly: true,
    description: "Post the modmail message",
    usage: null,
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


async function createModmail(interaction: GuildComponentInteraction) {
    await interaction.defer(MessageFlags.EPHEMERAL);

    const thread = await db.transaction().execute(async t => {
        const { channelId, id } = await t.insertInto("modMail")
            .values({
                channelId: "0",
                userId: interaction.user.id
            })
            .onConflict(oc => oc
                .column("userId")
                .doUpdateSet({ id: eb => eb.ref("excluded.id") })
            )
            .returning(["channelId", "id"])
            .executeTakeFirstOrThrow();

        if (channelId !== "0") {
            interaction.createFollowup({
                content: `You already have a modmail ticket open: <#${channelId}>`,
                flags: MessageFlags.EPHEMERAL
            });
            return null;
        }

        const thread = await getThreadParent().startThreadWithoutMessage({
            type: ChannelTypes.PRIVATE_THREAD,
            name: `${id}`,
            invitable: false
        });

        await t.updateTable("modMail")
            .set("channelId", thread.id)
            .where("id", "=", id)
            .execute();

        return thread;
    });

    if (!thread) return;

    const msg = await thread.createMessage({
        content: `👋 ${interaction.user.mention}\n\nPlease describe your issue with as much detail as possible. A moderator will be with you shortly.`,
        components: [{
            type: ComponentTypes.ACTION_ROW,
            components: [
                {
                    type: ComponentTypes.BUTTON,
                    label: "Close ticket",
                    style: ButtonStyles.DANGER,
                    customID: `modmail:close:${thread.id}`,
                    emoji: {
                        name: Emoji.TrashCan
                    }
                },
                {
                    type: ComponentTypes.BUTTON,
                    label: "User ignored modmail rules",
                    style: ButtonStyles.DANGER,
                    customID: `modmail:close-ban:${thread.id}`,
                    emoji: {
                        name: Emoji.Hammer
                    }
                }
            ]
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
        content: `📩 👉 ${thread.mention}`,
        flags: MessageFlags.EPHEMERAL
    });

    await interaction.deleteFollowup(interaction.message.id);

    await log(`${interaction.user.mention} opened ticket ${thread.mention}`);
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
                        label: "I need Vencord support",
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
                    {
                        label: "My Vencord is broken!",
                        value: Ids.REASON_MONKEY + 4
                    }
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

    createModmail(interaction);
}

async function closeModmail(interaction: GuildInteraction, isBan: boolean) {
    if (interaction.channel.type !== ChannelTypes.PRIVATE_THREAD || interaction.channel.threadMetadata.archived)
        return;

    if (isBan && !interaction.member.permissions.has("MODERATE_MEMBERS")) return;

    const res = await db.selectFrom("modMail")
        .where("channelId", "=", interaction.channel.id)
        .select(["userId", "id"])
        .executeTakeFirst();
    if (!res) return;

    if (!interaction.member.permissions.has("MANAGE_CHANNELS") && res.userId !== interaction.user.id)
        return;

    await interaction.defer(MessageFlags.EPHEMERAL);

    await interaction.channel.edit({ archived: true });
    await db.deleteFrom("modMail")
        .where("id", "=", res.id)
        .execute();

    await log(`Ticket ${interaction.channel.mention} has been closed by ${interaction.user.mention}!`);

    await interaction.createFollowup({
        content: "Ticket closed.",
        flags: MessageFlags.EPHEMERAL
    });

    const member = await interaction.guild.getMember(res.userId);
    if (!member) return;

    if (isBan) {
        member.addRole(MODMAIL_BAN_ROLE_ID);
        sendDm(member.user, {
            content: stripIndent`
                Your modmail ticket has been closed and you have been banned from creating tickets.

                This is most likely because you didn't follow the modmail rules. See <#${THREAD_PARENT_ID}> for more information.
            `
        });
    } else {
        sendDm(member.user, {
            content: stripIndent`
                Your modmail ticket has been closed as resolved.

                It will remain accessible at ${interaction.channel.mention} for future reference.
            `
        });
    }
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
    else if (interaction.data.customID.startsWith("modmail:close:") || interaction.data.customID.startsWith("modmail:close-ban:"))
        closeModmail(interaction as GuildInteraction, interaction.data.customID.startsWith("modmail:close-ban:"));
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
