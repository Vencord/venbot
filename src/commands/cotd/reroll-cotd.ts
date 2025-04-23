import { ButtonStyles, ComponentTypes, CreateMessageOptions, EditMessageOptions, MessageFlags, User } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { drawBlobCatCozy, rerollCotd } from "~/modules/regularCotd";
import { handleComponentInteraction } from "~/SlashCommands";
import { toHexColorString } from "~/util/colors";

async function reroll(hex?: string, interactionUser?: User): Promise<CreateMessageOptions & EditMessageOptions> {
    const color = await rerollCotd(hex);
    const image = await drawBlobCatCozy(color);

    return {
        files: [{
            name: "blobcatcozy.png",
            contents: image
        }],
        flags: MessageFlags.IS_COMPONENTS_V2,
        components: [
            {
                type: ComponentTypes.CONTAINER,
                accentColor: parseInt(color.slice(1), 16),
                components: [
                    {
                        type: ComponentTypes.TEXT_DISPLAY,
                        content: `### New cozy of the day: ${color}`,
                    },
                    {
                        type: ComponentTypes.MEDIA_GALLERY,
                        items: [{
                            media: {
                                url: "attachment://blobcatcozy.png",
                            }
                        }]
                    },
                    ...(!interactionUser
                        ? []
                        : [
                            {
                                type: ComponentTypes.TEXT_DISPLAY,
                                content: `-# Last rerolled <t:${Math.round(Date.now() / 1000)}> by ${interactionUser.mention}`
                            }
                        ] as const
                    ),
                    {
                        type: ComponentTypes.ACTION_ROW,
                        components: [{
                            type: ComponentTypes.BUTTON,
                            style: ButtonStyles.SECONDARY,
                            label: "Reroll again",
                            emoji: {
                                name: Emoji.Die
                            },
                            customID: "reroll-cotd",
                            disabled: hex != null
                        }]
                    }
                ]
            }
        ]
    };
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
