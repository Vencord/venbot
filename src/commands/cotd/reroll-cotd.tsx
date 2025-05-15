import { ButtonStyles, CreateMessageOptions, EditMessageOptions, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { ActionRow, Button, ComponentMessage, Container, MediaGallery, MediaGalleryItem, TextDisplay } from "~/components";
import { Emoji } from "~/constants";
import { drawBlobCatCozy, rerollCotd } from "~/modules/regularCotd";
import { handleComponentInteraction } from "~/SlashCommands";
import { toHexColorString } from "~/util/colors";

async function reroll(hex?: string, interactionUser?: User): Promise<CreateMessageOptions & EditMessageOptions> {
    const color = await rerollCotd(hex);
    const image = await drawBlobCatCozy(color);

    return (
        <ComponentMessage files={[{
            name: "blobcatcozy.png",
            contents: image
        }]}>
            <Container accentColor={parseInt(color.slice(1), 16)}>
                <TextDisplay>### New cozy of the day: {color}</TextDisplay>
                <MediaGallery>
                    <MediaGalleryItem url="attachment://blobcatcozy.png" />
                </MediaGallery>

                {interactionUser && <TextDisplay>-# Last rerolled {`<t:${Math.round(Date.now() / 1000)}>`} by {interactionUser.mention}</TextDisplay>}

                <ActionRow>
                    <Button
                        style={ButtonStyles.SECONDARY}
                        customID="reroll-cotd"
                        disabled={hex != null}
                        emoji={{ name: Emoji.Die }}
                    >
                        Reroll again
                    </Button>
                </ActionRow>
            </Container>
        </ComponentMessage>
    );
}

defineCommand({
    name: "reroll-cotd",
    description: "Rerolls the current cozy of the day",
    usage: "[hex]",
    guildOnly: true,
    modOnly: true,
    async execute({ reply }, hex?: string) {
        if (hex) {
            const parsed = Number(hex.replace(/^#/, "0x"));

            if (isNaN(parsed)) {
                return reply("wtf is that hex");
            }

            hex = toHexColorString(parsed);
        }

        const result = await reroll(hex);
        return reply(result);
    }
});

handleComponentInteraction({
    customID: "reroll-cotd",
    guildOnly: true,
    modOnly: true,
    async handle(interaction) {
        const result = await reroll(undefined, interaction.user);
        await interaction.editParent(result);
    },
});
