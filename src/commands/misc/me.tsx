import { MessageFlags, SeparatorSpacingSize } from "oceanic.js";
import { registerChatInputCommand } from "~/SlashCommands";
import { fetchBuffer } from "~/util/fetch";
import { CommandAttachmentOption, CommandStringOption, ComponentMessage, Container, File as FileComponent, MediaGallery, MediaGalleryItem, Separator, TextDisplay } from "~components";

registerChatInputCommand({
    name: "me",
    description: "Send a message",
    options: <>
        <CommandStringOption name="content" description="The message content" required />
        <CommandAttachmentOption name="attachment" description="An optional attachment" />
    </>
}, {
    async handle(interaction) {
        const content = interaction.data.options.getString("content", true);
        const attachment = interaction.data.options.getAttachment("attachment");

        if (attachment && interaction.member && !interaction.member.permissions.has("ATTACH_FILES")) {
            return interaction.reply({
                content: "You don't have permission to attach files!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        await interaction.defer();

        return interaction.reply(
            <ComponentMessage files={attachment && [{ name: attachment.filename, contents: await fetchBuffer(attachment.url) }]}>
                <Container>
                    <TextDisplay>{content}</TextDisplay>
                    {attachment &&
                        (attachment.contentType?.startsWith("image/")
                            ? <MediaGallery><MediaGalleryItem url={`attachment://${attachment.filename}`} /></MediaGallery>
                            : <FileComponent filename={attachment.filename} />
                        )
                    }
                    <Separator spacing={SeparatorSpacingSize.LARGE} />
                    <TextDisplay>-# ~ {interaction.user.tag}</TextDisplay>
                </Container>
            </ComponentMessage>
        );
    },
});
