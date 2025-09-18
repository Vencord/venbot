import { ActivityTypes, AnyTextableGuildChannel, ApplicationCommandTypes, ButtonStyles, ChannelTypes, CommandInteraction, ComponentInteraction, ComponentTypes, InteractionTypes, MessageActionRow, MessageFlags, SelectMenuTypes, TextButton, TextChannel, TextInputStyles } from "oceanic.js";

import { db } from "~/db";
import { handleCommandInteraction, handleComponentInteraction, handleInteraction } from "~/SlashCommands";
import { sendDm } from "~/util/discord";
import { stripIndent } from "~/util/text";

import Config from "~/config";
import { Vaius } from "../Client";
import { defineCommand } from "../Commands";
import { Emoji, PROD } from "../constants";

const { banRoleId, channelId, enabled, logChannelId, modRoleId } = Config.modmail;

const enum Ids {
    OPEN_TICKET = "modmail:open_ticket",
    OPEN_CONFIRM = "modmail:open_confirm",
    OPEN_SUBMIT = "modmail:open_submit",

    REASON_MONKEY = "modmail:iamamonkey",
    REASON_MOD = "modmail:mod",
    REASON_DONOR = "modmail:donor",
    REASON_PLUGIN = "modmail:plugin",
    REASON_CSS = "modmail:css",
    REASON_JS = "modmail:js"
}

const ChannelNameAndPrompt: Record<string, [string, string]> = {
    [Ids.REASON_MOD]: ["ticket", "Please post any supporting media or information that you have."],
    [Ids.REASON_PLUGIN]: ["plugin-submission", "Please post the full message + image(s) that you would like to post in the plugin channel."],
    [Ids.REASON_CSS]: ["css-submission", "Please post the full message + image(s) that you would like to post in the css snippet channel."],
    [Ids.REASON_JS]: ["js-submission", "Please post the full message + image(s) that you would like to post in the js snippet channel."]
};

const COMMAND_NAME = PROD ? "modmail" : "devmodmail";

type GuildInteraction = ComponentInteraction<ComponentTypes.BUTTON, AnyTextableGuildChannel> | CommandInteraction<AnyTextableGuildChannel>;

async function log(content: string) {
    return Vaius.rest.channels.createMessage(channelId, {
        content
    });
}

function getThreadParent() {
    const c = Vaius.getChannel(channelId);
    if (!c) throw new Error("Modmail category not found");

    return c as TextChannel;
}

async function createModmailConfirm(interaction: GuildInteraction) {
    if (interaction.member.roles.includes(banRoleId)) {
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
                customID: Ids.OPEN_CONFIRM,
                options: [
                    {
                        label: "I want to submit my plugin",
                        value: Ids.REASON_PLUGIN,
                        emoji: { name: "🧩" }
                    },
                    {
                        label: "I want to submit my css snippet",
                        value: Ids.REASON_CSS,
                        emoji: { name: "🎨" }
                    },
                    {
                        label: "I want to submit my js snippet",
                        value: Ids.REASON_JS,
                        emoji: { name: "🛠️" }
                    },
                    {
                        label: "I need help with Vencord",
                        value: Ids.REASON_MONKEY + 1,
                        emoji: { name: "🛟" }
                    },
                    {
                        label: "I need to talk to a moderator",
                        value: Ids.REASON_MOD,
                        emoji: { name: "👥" }
                    },
                    {
                        label: "I donated and want to redeem my rewards",
                        value: Ids.REASON_DONOR,
                        emoji: { name: "🤝" }
                    },
                    {
                        label: "I need Vencord support",
                        value: Ids.REASON_MONKEY + 2,
                        emoji: { name: "🛟" }
                    },
                    {
                        label: "I just want to test modmail",
                        value: Ids.REASON_MONKEY + 3,
                        emoji: { name: "🛟" }
                    },
                    {
                        label: "My Vencord is broken!",
                        value: Ids.REASON_MONKEY + 4,
                        emoji: { name: "🛟" }
                    }
                ]
            }]
        }]
    });
}

defineCommand({
    enabled,

    name: "modmail:post",
    ownerOnly: true,
    description: "Post the modmail message",
    usage: null,
    execute() {
        return Vaius.rest.channels.createMessage(channelId, {
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

if (enabled) {
    handleCommandInteraction({
        name: COMMAND_NAME,
        guildOnly: true,
        handle: createModmailConfirm
    });

    handleComponentInteraction({
        customID: Ids.OPEN_TICKET,
        guildOnly: true,
        handle: createModmailConfirm
    });


    handleComponentInteraction({
        customID: Ids.OPEN_CONFIRM,
        guildOnly: true,
        async handle(interaction: ComponentInteraction<SelectMenuTypes, AnyTextableGuildChannel>) {
            if (interaction.member.roles.includes(banRoleId)) {
                return interaction.createMessage({
                    content: "You are banned from using modmail.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

            const reason = interaction.data.values.getStrings()[0];

            if (reason.startsWith(Ids.REASON_MONKEY)) {
                return await interaction.createMessage({
                    content: `This form is NOT FOR VENCORD SUPPORT OR TESTING. To get Vencord support, use <#${Config.channels.support}>`,
                    flags: MessageFlags.EPHEMERAL
                });
            }

            if (reason === Ids.REASON_DONOR) {
                return await interaction.createMessage({
                    content: "Thanks a lot for donating! Please private message <@343383572805058560> to redeem your perks! Make sure you have your DMs open or it won't work.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

            await interaction.createModal({
                title: "Open a Ticket",
                customID: `${Ids.OPEN_SUBMIT}:${reason}`,
                components: [{
                    type: ComponentTypes.ACTION_ROW,
                    components: [{
                        type: ComponentTypes.TEXT_INPUT,
                        label: "Why are you creating this ticket?",
                        customID: "message",
                        placeholder: "You will be able to attach media & more info after submitting this form",
                        style: TextInputStyles.PARAGRAPH,
                        required: true,
                        minLength: 20,
                        maxLength: 1000
                    }]
                }]
            });
        }
    });

    handleInteraction({
        type: InteractionTypes.MODAL_SUBMIT,
        isMatch: i => i.data.customID.startsWith(Ids.OPEN_SUBMIT + ":"),
        async handle(interaction) {
            const message = interaction.data.components.getTextInput("message");

            const reason = interaction.data.customID.slice(Ids.OPEN_SUBMIT.length + 1);

            await interaction.defer(MessageFlags.EPHEMERAL);

            const [channelName, prompt] = ChannelNameAndPrompt[reason];
            if (!channelName) return interaction.createFollowup({ content: "Something went wrong", flags: MessageFlags.EPHEMERAL });

            const thread = await db.transaction().execute(async t => {
                const { channelId, id } = await t.insertInto("tickets")
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
                    name: `${channelName}-${id}`,
                    invitable: false
                });

                await t.updateTable("tickets")
                    .set("channelId", thread.id)
                    .where("id", "=", id)
                    .execute();

                return thread;
            });

            if (!thread) return;

            const msg = await thread.createMessage({
                content: `👋 ${interaction.user.mention}\n\n${prompt}. A moderator will be with you shortly!\n### Message\n${message}`,
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
                        },
                        {
                            type: ComponentTypes.BUTTON,
                            label: "Claim ticket",
                            style: ButtonStyles.SECONDARY,
                            customID: `modmail:claim-ticket:${thread.id}`,
                            emoji: {
                                name: Emoji.Claim
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
                    roles: [modRoleId],
                },
                content: msg.content.replace("moderator", `<@&${modRoleId}>`)
            });

            await interaction.createFollowup({
                content: `📩 👉 ${thread.mention}`,
                flags: MessageFlags.EPHEMERAL
            });

            await log(`${interaction.user.mention} opened ${channelName.replace("-", " ")} ${thread.mention}`);
        }
    });


    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: i => i.data.customID.startsWith("modmail:close:") || i.data.customID.startsWith("modmail:close-ban:"),
        async handle(interaction) {
            if (interaction.channel.type !== ChannelTypes.PRIVATE_THREAD || interaction.channel.threadMetadata.archived)
                return;

            const isBan = interaction.data.customID.startsWith("modmail:close-ban:");

            const isModAction = interaction.member.roles.includes(modRoleId);

            if (isBan && !isModAction) return;

            const res = await db.selectFrom("tickets")
                .where("channelId", "=", interaction.channel.id)
                .select(["userId", "id"])
                .executeTakeFirst();
            if (!res) return;

            if (res.userId !== interaction.user.id && !isModAction)
                return;

            await interaction.defer(MessageFlags.EPHEMERAL);

            await interaction.channel.edit({ archived: true, locked: true });
            await db.deleteFrom("tickets")
                .where("id", "=", res.id)
                .execute();

            await log(`Ticket ${interaction.channel.mention} has been closed by ${interaction.user.mention}!`);

            await interaction.createFollowup({
                content: "Ticket closed.",
                flags: MessageFlags.EPHEMERAL
            });

            const member = await interaction.guild.getMember(res.userId).catch(() => null);
            if (!member) return;

            if (isBan) {
                member.addRole(banRoleId);
                sendDm(member.user, {
                    content: stripIndent`
                    Your modmail ticket has been closed and you have been banned from creating tickets.

                    This is most likely because you didn't follow the modmail rules. See <#${channelId}> for more information.
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
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: i => i.data.customID.startsWith("modmail:claim-ticket:"),
        async handle(interaction) {
            const isModAction = interaction.member.roles.includes(modRoleId);

            if (!isModAction) return;

            await interaction.defer(MessageFlags.EPHEMERAL);

            await interaction.channel.edit({
                name: `[${interaction.member.username}] ${interaction.channel.name}`
            });

            // replace the Claim ticket button with a disabled one
            const { components } = interaction.message;
            (components[0] as MessageActionRow).components.find(
                component =>
                    component.type === ComponentTypes.BUTTON
                    && (component as TextButton).customID.startsWith("modmail:claim-ticket:")
            )!.disabled = true;

            await interaction.message.edit({
                components
            });

            await interaction.createFollowup({
                content: "Ticket claimed.",
                flags: MessageFlags.EPHEMERAL
            });
        }
    });

    Vaius.once("ready", () => {
        if (PROD) {
            Vaius.editStatus("online", [{
                type: ActivityTypes.LISTENING,
                name: "/modmail"
            }]);
        }

        Vaius.application.createGuildCommand(Config.homeGuildId, {
            type: ApplicationCommandTypes.CHAT_INPUT,
            name: COMMAND_NAME,
            description: "Open a modmail ticket",
        });
    });
}
