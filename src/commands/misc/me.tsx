import { CommandInteraction, MessageFlags, SeparatorSpacingSize } from "oceanic.js";
import { registerChatInputCommand } from "~/SlashCommands";
import { doFetch, fetchBuffer } from "~/util/fetch";
import { CommandAttachmentOption, CommandStringOption, ComponentMessage, Container, File as FileComponent, MediaGallery, MediaGalleryItem, Separator, TextDisplay } from "~components";

async function resolveAttachment(i: CommandInteraction) {
    const attachment = i.data.options.getAttachment("attachment");
    if (attachment) {
        return {
            name: attachment.filename,
            contents: await fetchBuffer(attachment.url),
            type: attachment.contentType || "application/octet-stream"
        };
    }

    const url = i.data.options.getString("attachment-url");
    if (!url) return;

    const res = await doFetch(url).catch(() => null);
    if (!res) return;

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const filename = new URL(url).pathname.split("/").pop() || "file";

    return {
        name: filename,
        contents: Buffer.from(await res.arrayBuffer()),
        type: contentType
    };
}

registerChatInputCommand({
    name: "me",
    description: "Send a message",
    options: <>
        <CommandStringOption name="content" description="The message content" required />
        <CommandAttachmentOption name="attachment" description="An optional attachment" />
        <CommandStringOption name="attachment-url" description="A URL to an attachment" />
    </>
}, {
    async handle(interaction) {
        const content = interaction.data.options.getString("content", true);
        const attachment = await resolveAttachment(interaction);

        if (attachment && interaction.member && !interaction.member.permissions.has("ATTACH_FILES")) {
            return interaction.reply({
                content: "You don't have permission to attach files!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        await interaction.defer();

        return interaction.reply(
            <ComponentMessage files={attachment && [attachment]}>
                <Container>
                    <TextDisplay>{content}</TextDisplay>
                    {attachment &&
                        (attachment.type.startsWith("image/") || attachment.type.startsWith("video/")
                            ? <MediaGallery><MediaGalleryItem url={`attachment://${attachment.name}`} /></MediaGallery>
                            : <FileComponent filename={attachment.name} />
                        )
                    }
                    <Separator spacing={SeparatorSpacingSize.LARGE} />
                    <TextDisplay>-# ~ {interaction.user.tag}</TextDisplay>
                </Container>
            </ComponentMessage>
        );
    },
});
