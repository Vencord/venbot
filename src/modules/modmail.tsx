import { ActivityTypes, AnyTextableGuildChannel, ApplicationCommandTypes, ButtonStyles, ChannelTypes, CommandInteraction, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, ModalSubmitInteraction, SeparatorSpacingSize, TextChannel, TextInputStyles } from "oceanic.js";

import { db } from "~/db";
import { handleCommandInteraction, handleComponentInteraction, handleInteraction } from "~/SlashCommands";
import { stripIndent } from "~/util/text";

import { grantSubmissionPass } from "~/commands/moderation/submission-pass";
import Config from "~/config";
import { partition } from "~/util/arrays";
import { sendDm } from "~/util/discord";
import { fetchBuffer } from "~/util/fetch";
import { run } from "~/util/functions";
import { isNonNullish } from "~/util/guards";
import { ActionRow, Button, ComponentMessage, Container, File, FileUpload, MediaGallery, MediaGalleryItem, ModalLabel, Separator, StringOption, StringSelect, TextDisplay, TextInput } from "~components";
import { Vaius } from "../Client";
import { defineCommand } from "../Commands";
import { Emoji, MANAGEABLE_ROLES, PROD } from "../constants";

const { banRoleId, channelId, enabled, logChannelId, modRoleId } = Config.modmail;

const enum Ids {
    OPEN_TICKET = "modmail:open_ticket",
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
    return Vaius.rest.channels.createMessage(logChannelId, {
        content
    });
}

function getThreadParent() {
    const c = Vaius.getChannel(channelId);
    if (!c) throw new Error("Modmail category not found");

    return c as TextChannel;
}

async function createModmailModal(interaction: GuildInteraction) {
    if (interaction.member.roles.includes(banRoleId)) {
        return interaction.createMessage({
            content: "You are banned from using modmail.",
            flags: MessageFlags.EPHEMERAL
        });
    }

    const options = [
        {
            label: "I donated and want to redeem my rewards",
            value: Ids.REASON_DONOR,
            emoji: { name: "❤️" }
        },
        {
            label: "I need help with Vencord",
            value: Ids.REASON_MONKEY + 1,
            emoji: { name: "🛟" }
        },
        {
            label: "My Vencord is broken!",
            value: Ids.REASON_MONKEY + 2,
            emoji: { name: "🛟" }
        },
        {
            label: "I need to talk to a moderator",
            value: Ids.REASON_MOD,
            emoji: { name: "👥" }
        },
        {
            label: "I want to submit my css snippet",
            value: Ids.REASON_CSS,
            emoji: { name: "🎨" }
        },
        {
            label: "I want to submit my plugin",
            value: Ids.REASON_PLUGIN,
            emoji: { name: "🧩" }
        },
        {
            label: "I want to submit my js snippet",
            value: Ids.REASON_JS,
            emoji: { name: "🛠️" }
        },
    ];

    await interaction.createModal({
        title: "Open a Ticket",
        customID: Ids.OPEN_SUBMIT,
        components: <>
            <TextDisplay>
                {stripIndent`
                    Before submitting your ticket, please make sure it follows the rules:
                    - Tickets are **only for issues regarding this server** that require moderator attention
                    - Tickets are **not for Vencord support or questions**! Use <#1026515880080842772>
                    - We only moderate things that happen in this server. **Don't report users for things that happened elsewhere**. This includes DMs, unless it's a scam or ad. Block users to stop them from messaging you.
                `}
            </TextDisplay>

            <ModalLabel label="Why are you opening this ticket?">
                <StringSelect
                    placeholder="Choose a Reason"
                    customID="reason"
                    required
                >
                    {options}
                </StringSelect>
            </ModalLabel>

            <ModalLabel label="Type your message" description="Include any relevant information.">
                <TextInput
                    style={TextInputStyles.PARAGRAPH}
                    placeholder="Write your message here..."
                    customID="message"
                    minLength={20}
                    maxLength={1000}
                    required
                />
            </ModalLabel>
            <ModalLabel label="Add supporting media" description="Include any relevant attachments.">
                <FileUpload customID="attachments" minValues={0} maxValues={10} required={false} />
            </ModalLabel>
        </>
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
        handle: createModmailModal
    });

    handleComponentInteraction({
        customID: Ids.OPEN_TICKET,
        guildOnly: true,
        handle: createModmailModal
    });


    handleInteraction({
        type: InteractionTypes.MODAL_SUBMIT,
        isMatch: i => i.data.customID === Ids.OPEN_SUBMIT,
        async handle(interaction: ModalSubmitInteraction<TextChannel>) {
            if (interaction.member.roles.includes(banRoleId)) {
                return interaction.createMessage({
                    content: "You are banned from using modmail.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

            const reason = interaction.data.components.getStringSelectValues("reason", true)[0];

            if (reason.startsWith(Ids.REASON_MONKEY)) {
                return await interaction.createMessage({
                    content: `To get Vencord support, use <#${Config.channels.support}>`,
                    flags: MessageFlags.EPHEMERAL
                });
            }

            if (reason === Ids.REASON_DONOR) {
                return await interaction.createMessage({
                    content: "Thanks a lot for donating! Please private message <@343383572805058560> to redeem your perks! Make sure you have your DMs open or it won't work.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

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

            const message = interaction.data.components.getTextInput("message", true);
            const ephemeralAttachments = interaction.data.components.getFileUploadValues("attachments") ?? [];

            // need to reupload attachments as the ephemeral ones will expire
            const files = await Promise.all(ephemeralAttachments.map(async ({ url, filename, contentType }, i) => {
                const buf = await fetchBuffer(url);

                return {
                    name: `${i}-${filename}`,
                    contents: buf,
                    contentType
                };
            }));

            const [images, otherFiles] = partition(files, f => f.contentType?.startsWith("image/") ?? false);

            const msg = await thread.createMessage(
                <ComponentMessage allowedMentions={{ users: [interaction.user.id] }} files={files}>
                    <Container>
                        <TextDisplay>
                            👋 {interaction.user.mention}
                            <br /><br />
                            {prompt}
                            <br />
                            A moderator will be with you shortly!
                        </TextDisplay>
                    </Container>

                    <Container>
                        <TextDisplay>
                            ### User Message
                            <br />
                            {message}
                        </TextDisplay>

                        {files.length > 0 && <Separator spacing={SeparatorSpacingSize.LARGE} divider={false} />}

                        {images.length > 0 && (
                            <MediaGallery>
                                {images.map(f => <MediaGalleryItem url={`attachment://${f.name}`} />)}
                            </MediaGallery>
                        )}
                        {otherFiles.map(f => <File filename={f.name} />)}
                    </Container>

                    <ActionRow>
                        <Button
                            customID={`modmail:close:${thread.id}`}
                            style={ButtonStyles.DANGER}
                            emoji={{ name: Emoji.TrashCan }}
                        >
                            Close ticket
                        </Button>
                        <Button
                            customID={`modmail:close-ban:${thread.id}`}
                            style={ButtonStyles.DANGER}
                            emoji={{ name: Emoji.Hammer }}
                        >
                            Close ticket & modmail-ban user
                        </Button>
                        {reason === Ids.REASON_PLUGIN
                            ? (
                                <Button
                                    customID={`modmail:approve-submission:${thread.id}`}
                                    style={ButtonStyles.SUCCESS}
                                    emoji={{ name: "✅" }}
                                >
                                    Approve Submission
                                </Button>
                            )
                            : (
                                <Button
                                    customID={`modmail:manage-roles:${thread.id}`}
                                    style={ButtonStyles.SECONDARY}
                                    emoji={{ name: "👤" }}
                                >
                                    Manage Roles
                                </Button>
                            )
                        }
                    </ActionRow>
                </ComponentMessage>
            );

            // @ts-ignore trolley
            msg.components[0].components[0].content = msg.components[0].components[0].content.replace("moderator", `<@&${modRoleId}>`);
            await msg.edit({
                allowedMentions: {
                    roles: [modRoleId],
                },
                components: msg.components
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

            const messageContent = run(() => {
                if (isBan) {
                    member.addRole(banRoleId);
                    return stripIndent`
                        Your modmail ticket has been closed and you have been banned from creating tickets.

                        This is most likely because you didn't follow the modmail rules. See <#${channelId}> for more information.
                    `;
                } else {
                    return stripIndent`
                        Your modmail ticket has been closed as resolved.

                        It will remain accessible at ${interaction.channel.mention} for future reference. (If it says \`#unknown\`, just click on it to load it)
                    `;
                }
            });

            const sentDm = await sendDm(member.user, { content: messageContent });
            if (!sentDm) {
                await interaction.channel.createMessage({
                    allowedMentions: { users: [member.id] },
                    content: stripIndent`
                        ${member.user.mention}

                        This ticket has been closed as resolved${isBan ? " and you have been banned from creating tickets due to breaking the rules.\n" : ". "}You can find this ticket again in the future via the Threads tab.
                    `
                });
                await interaction.channel.edit({ archived: true, locked: true });
            }
        }
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: i => i.data.customID.startsWith("modmail:approve-submission:"),
        async handle(interaction) {
            const isModAction = interaction.member.roles.includes(modRoleId);
            if (!isModAction) return;

            await interaction.defer();

            const res = await db.selectFrom("tickets")
                .where("channelId", "=", interaction.channel.id)
                .select(["userId", "id"])
                .executeTakeFirst();
            if (!res) return;

            await grantSubmissionPass(interaction.guild, res.userId, interaction.user.tag);

            await interaction.createFollowup({
                allowedMentions: { users: [res.userId] },
                content: `<@${res.userId}>\n\nYour submission was approved by ${interaction.user.tag}! You can now post it in the appropriate channel.`,
            });
        }
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: i => i.data.customID.startsWith("modmail:manage-roles:"),
        async handle(interaction) {
            const isModAction = interaction.member.roles.includes(modRoleId);
            if (!isModAction) return;

            const options = MANAGEABLE_ROLES
                .map(roleId => interaction.guild.roles.get(roleId))
                .filter(isNonNullish)
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 25)
                .map(role => <StringOption label={role.name} value={role.id} />);

            await interaction.createMessage(
                <ComponentMessage flags={MessageFlags.EPHEMERAL}>
                    <Container>
                        <TextDisplay>## Manage User Roles</TextDisplay>
                        <ActionRow>
                            <StringSelect customID={interaction.data.customID.replace("manage-roles", "add-role")} placeholder="Add role" >{options}</StringSelect>
                        </ActionRow>
                        <ActionRow>
                            <StringSelect customID={interaction.data.customID.replace("manage-roles", "remove-role")} placeholder="Remove role" >{options}</StringSelect>
                        </ActionRow>
                    </Container>
                </ComponentMessage>
            );
        }
    });

    handleInteraction({
        type: InteractionTypes.MESSAGE_COMPONENT,
        guildOnly: true,
        isMatch: i => i.data.customID.startsWith("modmail:add-role:") || i.data.customID.startsWith("modmail:remove-role:"),
        async handle(interaction: ComponentInteraction<ComponentTypes.STRING_SELECT, AnyTextableGuildChannel>) {
            const isModAction = interaction.member.roles.includes(modRoleId);
            if (!isModAction) return;

            const roleId = interaction.data.values.getStrings()[0];
            if (!roleId || !MANAGEABLE_ROLES.includes(roleId)) return;

            const isAdd = interaction.data.customID.startsWith("modmail:add-role:");

            await interaction.defer();

            const res = await db.selectFrom("tickets")
                .where("channelId", "=", interaction.channel.id)
                .select(["userId", "id"])
                .executeTakeFirst();
            if (!res) return;

            await interaction.guild[isAdd ? "addMemberRole" : "removeMemberRole"](
                res.userId,
                interaction.data.values.getStrings()[0],
                `${isAdd ? "Added" : "Removed"} by ${interaction.user.tag} via ticket ${res.id}`
            );

            await interaction.createFollowup({
                allowedMentions: { users: [res.userId] },
                content: `<@${res.userId}>\n\nThe role <@&${roleId}> has been ${isAdd ? "added to" : "removed from"} you by ${interaction.user.tag}.`,
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
