
import { ButtonStyles, SeparatorSpacingSize } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { ActionRow, Button, ComponentMessage, Container, Separator, TextDisplay } from "~components";

defineCommand({
    name: "testm",
    description: "a",
    usage: null,
    ownerOnly: true,
    execute({ reply }) {
        return reply(
            <ComponentMessage>
                <Container>
                    <TextDisplay># Modmail</TextDisplay>

                    <TextDisplay>Do you need to talk to a moderator? Get in touch by opening a ticket!</TextDisplay>

                    <Separator spacing={SeparatorSpacingSize.LARGE} />

                    <TextDisplay>## Get Support</TextDisplay>
                    <ActionRow>
                        <Button
                            style={ButtonStyles.LINK}
                            emoji={{ name: "🫂" }}
                            url="https://discord.com/channels/1015060230222131221/1026515880080842772"
                        >
                            Get help with Vencord
                        </Button>
                        <Button
                            style={ButtonStyles.LINK}
                            emoji={{ name: "❓" }}
                            url="https://discord.com/channels/1015060230222131221/1026515880080842772"
                        >
                            Ask a question about Vencord
                        </Button>
                    </ActionRow>

                    <Separator spacing={SeparatorSpacingSize.SMALL} divider={false} />

                    <TextDisplay>## Open a Ticket</TextDisplay>
                    <ActionRow>
                        <Button
                            style={ButtonStyles.SECONDARY}
                            customID="modmail:normal"
                            emoji={{ name: "🗣️" }}
                        >
                            Talk to a Mod
                        </Button>
                        <Button
                            style={ButtonStyles.LINK}
                            emoji={{ name: "❤️" }}
                            url="https://discord.com/users/343383572805058560"
                        >
                            Claim Donor Perks
                        </Button>
                    </ActionRow>

                    <Separator spacing={SeparatorSpacingSize.SMALL} divider={false} />

                    <ActionRow>
                        <Button
                            style={ButtonStyles.SECONDARY}
                            customID="modmail:submit-plugin"
                            emoji={{ name: "🧩" }}
                        >
                            Submit Plugin
                        </Button>
                        <Button
                            style={ButtonStyles.SECONDARY}
                            customID="modmail:submit-css"
                            emoji={{ name: "🎨" }}
                        >
                            Submit CSS Snippet
                        </Button>
                        <Button
                            style={ButtonStyles.SECONDARY}
                            customID="modmail:submit-js"
                            emoji={{ name: "🧪" }}
                        >
                            Submit JS Snippet
                        </Button>
                    </ActionRow>
                </Container>
            </ComponentMessage>
        );
    }
});
