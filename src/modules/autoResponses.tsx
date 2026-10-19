import { AnyTextableGuildChannel, ApplicationCommandOptionTypes, ChannelTypes, InteractionTypes, Message, MessageFlags, Permissions, TextInputStyles } from "oceanic.js";
import * as v from "valibot";
import Config from "~/config";
import { Emoji, PROD } from "~/constants";
import { AutoResponseContentType, db } from "~/db";
import { handleInteraction, registerChatInputCommand } from "~/SlashCommands";
import { reply } from "~/util/discord";
import { fetchJson } from "~/util/fetch";
import { toCodeblock } from "~/util/text";
import { ChannelSelect, ModalLabel, StringOption, StringSelect, TextInput } from "~components";

interface AutoResponse {
    name: string;
    match: RegExp;
    response: string;
    contentTypes: AutoResponseContentType;
    channelIds: string[];
}

const AutoResponseImportSchema = v.array(
    v.object({
        name: v.string(),
        match: v.pipe(v.string(), v.rawTransform(({ addIssue, dataset, NEVER }) => {
            try {
                return new RegExp(dataset.value, "i");
            } catch {
                addIssue({
                    message: "Invalid regular expression: " + dataset.value
                });
                return NEVER;
            }
        })),
        response: v.string(),
        contentTypes: v.enum(AutoResponseContentType),
        channelIds: v.array(v.string())
    })
);

let autoResponses = [] as AutoResponse[];

async function loadResponses() {
    const rows = await db.selectFrom("autoResponses").selectAll().execute();

    autoResponses = rows.map(r => ({
        name: r.name,
        match: new RegExp(r.match, "i"),
        response: r.response,
        contentTypes: r.contentTypes as AutoResponseContentType,
        channelIds: r.channelIds?.split(",") ?? []
    }));
}

loadResponses();

export async function maybeAutoRespond(msg: Message<AnyTextableGuildChannel>, text: string, isOcr: boolean) {
    if (!text) return;

    const response = autoResponses.find(r => {
        if (r.contentTypes === AutoResponseContentType.TEXT && !isOcr) return false;
        if (r.contentTypes === AutoResponseContentType.IMAGES && isOcr) return false;
        if (r.channelIds.length && !r.channelIds.includes(msg.channel.id) && !(msg.channel.parentID && r.channelIds.includes(msg.channel.parentID))) return false;

        return r.match.test(text);
    });

    return response && await reply(msg, { content: `${response.response}\n\n-# This is an auto-response based on keywords detected in your message.` });
}

const allowedRoles = [Config.roles.mod, Config.roles.helper];

registerChatInputCommand({
    name: PROD ? "auto-response" : "dev-auto-response",
    description: "Manage auto-responses based on keywords",
    defaultMemberPermissions: Permissions.MANAGE_MESSAGES.toString(),
    options: [
        {
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "add",
            description: "Add a new auto-response"
        },
        {
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "edit",
            description: "Edit an existing auto-response",
            options: [
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: "name",
                    description: "The name of the auto-response to edit",
                    required: true,
                    autocomplete: true
                }
            ]
        },
        {
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "remove",
            description: "Remove an existing auto-response",
            options: [
                {
                    type: ApplicationCommandOptionTypes.STRING,
                    name: "name",
                    description: "The name of the auto-response to remove",
                    required: true,
                    autocomplete: true
                }
            ]
        },
        {
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "list",
            description: "List all auto-responses"
        },
        {
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "export",
            description: "Export auto-responses as JSON"
        },
        {
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "import",
            description: "Import auto-responses from JSON. This can overwrite existing auto-responses. Export first!",
            options: [
                {
                    type: ApplicationCommandOptionTypes.ATTACHMENT,
                    name: "file",
                    description: "The JSON file containing auto-responses",
                    required: true
                }
            ]
        }
    ]
}, {
    allowedRoles,

    async handle(interaction) {
        const [subcommand] = interaction.data.options.getSubCommand(true);

        const flags = MessageFlags.EPHEMERAL;
        switch (subcommand) {
            case "add":
            case "edit": {
                const isEdit = subcommand === "edit";

                const name = isEdit ? interaction.data.options.getString("name", true) : "";

                const existingResponse = subcommand === "edit"
                    ? autoResponses.find(r => r.name === name)!
                    : {
                        contentTypes: AutoResponseContentType.ALL,
                        channelIds: ["1108135649699180705", "1024286218801926184"]
                    } as Partial<AutoResponse>;

                if (!existingResponse && subcommand === "edit") {
                    await interaction.reply({ flags, content: "Auto-response not found" });
                    return;
                }

                await interaction.createModal({
                    title: isEdit ? "Edit Auto-Response" : "Create Auto-Response",
                    customID: isEdit ? `edit-auto-response-modal:${name}` : "create-auto-response-modal",
                    components: <>
                        {!isEdit &&
                            <ModalLabel label="Name" description="Used to identify the auto-response. Must be unique">
                                <TextInput
                                    value={existingResponse.name}
                                    style={TextInputStyles.SHORT}
                                    customID="name"
                                    required
                                    maxLength={32}
                                    minLength={2}
                                />
                            </ModalLabel>
                        }

                        <ModalLabel label="Match" description="RegExp pattern to match">
                            <TextInput
                                value={existingResponse.match?.source}
                                style={TextInputStyles.PARAGRAPH}
                                customID="match"
                                required
                            />
                        </ModalLabel>

                        <ModalLabel label="Response" description="The response to send">
                            <TextInput
                                value={existingResponse.response}
                                style={TextInputStyles.PARAGRAPH}
                                customID="response"
                                required
                            />
                        </ModalLabel>

                        <ModalLabel label="Content Types" description="Types of content to match">
                            <StringSelect customID="contentTypes" required>
                                <StringOption label="Images & Text" value={AutoResponseContentType.ALL} default={existingResponse.contentTypes === AutoResponseContentType.ALL} />
                                <StringOption label="Images only" value={AutoResponseContentType.IMAGES} default={existingResponse.contentTypes === AutoResponseContentType.IMAGES} />
                                <StringOption label="Text only" value={AutoResponseContentType.TEXT} default={existingResponse.contentTypes === AutoResponseContentType.TEXT} />
                            </StringSelect>
                        </ModalLabel>

                        <ModalLabel label="Channels" description="Channels where the auto-response should be active">
                            <ChannelSelect
                                channelTypes={[ChannelTypes.GUILD_TEXT, ChannelTypes.GUILD_CATEGORY, ChannelTypes.GUILD_FORUM]}
                                customID="channels"
                                minValues={0}
                                maxValues={25}
                                required={false}
                                defaultValues={existingResponse.channelIds?.map(id => ({ id, type: "channel" }))}
                            />
                        </ModalLabel>
                    </>
                });
                break;
            }

            case "remove": {
                const name = interaction.data.options.getString("name", true);

                const { numDeletedRows } = await db.deleteFrom("autoResponses").where("name", "=", name).executeTakeFirst();
                const didDelete = numDeletedRows > 0;
                if (didDelete) await loadResponses();

                await interaction.reply({
                    content: didDelete
                        ? `${Emoji.CheckMark} Auto-response "${name}" removed successfully.`
                        : `${Emoji.X} Auto-response "${name}" not found.`
                });

                break;
            }
            case "list":
                await interaction.reply({
                    flags,
                    content: autoResponses.map(r => `- ${r.name}`).join("\n") || "No auto-responses found."
                });
                break;

            case "export": {
                if (!autoResponses.length) {
                    await interaction.reply({ content: "No auto-responses to export.", flags });
                    break;
                }

                const responseData = autoResponses.map(r => ({
                    ...r,
                    match: r.match.source
                }));

                await interaction.reply({
                    flags,
                    files: [{
                        contents: Buffer.from(JSON.stringify(responseData, null, 4)), name: "auto-responses.json"
                    }]
                });
                break;
            }

            case "import": {
                const file = interaction.data.options.getAttachment("file", true);
                const data = await fetchJson(file.url);

                const parseResult = v.safeParse(AutoResponseImportSchema, data);
                if (!parseResult.success) {
                    await interaction.reply({
                        flags,
                        content: `${Emoji.X} Invalid auto-response import data format. Should have the same format as exported auto-responses.\n\n${toCodeblock(parseResult.issues[0].message)}`
                    });
                    break;
                }

                const { numInsertedOrUpdatedRows } = await db
                    .replaceInto("autoResponses")
                    .values(parseResult.output.map(r => ({
                        ...r,
                        match: r.match.source,
                        channelIds: r.channelIds.join(",")
                    })))
                    .executeTakeFirst();

                await loadResponses();

                if (Number(numInsertedOrUpdatedRows!) === parseResult.output.length) {
                    await interaction.reply({ flags, content: `${Emoji.CheckMark} Successfully imported ${numInsertedOrUpdatedRows} auto-responses.` });
                } else {
                    await interaction.reply({ flags, content: `${Emoji.RedDot} Imported ${numInsertedOrUpdatedRows!} out of ${parseResult.output.length} auto-responses.` });
                }

                break;
            }
        }
    },

    autoComplete(interaction) {
        const name = interaction.data.options.getString("name", true);

        interaction.result(
            autoResponses
                .filter(r => r.name.toLowerCase().includes(name.toLowerCase()))
                .map(r => ({ name: r.name, value: r.name }))
        );
    }
});

handleInteraction({
    type: InteractionTypes.MODAL_SUBMIT,
    isMatch: i => i.data.customID === "create-auto-response-modal" || i.data.customID.startsWith("edit-auto-response-modal:"),
    guildOnly: true,
    allowedRoles,
    async handle(interaction) {
        const { customID, components } = interaction.data;

        const isEdit = customID.startsWith("edit-auto-response-modal:");

        const name = isEdit
            ? customID.split(":")[1]
            : components.getTextInput("name", true);

        const match = components.getTextInput("match", true);
        const response = components.getTextInput("response", true);
        const contentTypes = components.getStringSelectValues("contentTypes", true)[0];
        const channelIds = components.getChannelSelectValues("channels", true);

        const flags = MessageFlags.EPHEMERAL;
        try {
            new RegExp(match);
        } catch (error) {
            return interaction.reply({ flags, content: `Invalid regex pattern: ${String(error)}` });
        }

        const values = {
            name,
            match,
            response,
            contentTypes,
            channelIds: channelIds.map(c => c.id).join(",")
        };

        if (isEdit) {
            await db
                .updateTable("autoResponses")
                .set(values)
                .where("name", "=", name)
                .executeTakeFirst();

            await interaction.reply({ flags, content: `${Emoji.CheckMark} Auto-response "${name}" updated successfully.` });
            await loadResponses();
        } else {
            const res = await db
                .insertInto("autoResponses")
                .values(values)
                .onConflict(oc => oc.column("name").doNothing())
                .executeTakeFirst();

            if (res.numInsertedOrUpdatedRows) {
                await interaction.reply({ flags, content: `${Emoji.CheckMark} Auto-response "${name}" created successfully.` });
                await loadResponses();
            } else {
                await interaction.reply({ flags, content: `${Emoji.X} Auto-response "${name}" already exists.` });
            }
        }
    }
});
