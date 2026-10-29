import { gitCommitHash, gitRemote } from "__gitData__";
import { defineCommand } from "~/Commands";
import { makeEmbedSpaces, toInlineCode } from "~/util/text";
import { ActionRow, Button, ButtonStyles } from "~components";

defineCommand({
    name: "stats",
    aliases: ["info", "st"],
    description: "Display information about the bot",
    usage: null,
    async execute({ reply, msg: { client } }) {
        const rows = [
            [
                "Venbot Version",
                `[${toInlineCode(gitCommitHash.slice(0, 7))}](${gitRemote}/commit/${gitCommitHash})`
            ],
            [
                "Node.js",
                toInlineCode(process.version)
            ],
            [
                "Up Since",
                `<t:${Math.floor((Date.now() / 1000) - process.uptime())}:R>`
            ],
            [
                "Cached Users",
                client.users.size
            ],
            [
                "RAM Usage",
                `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`
            ],
        ] as const;

        const longestKeyLength = Math.max(...rows.map(([key]) => key.length));

        const description = rows.map(([key, value]) =>
            `**${toInlineCode(` ${key.padEnd(longestKeyLength, " ")} `)}**${makeEmbedSpaces(3)}${value}`
        ).join("\n");

        return reply({
            embeds: [{
                author: {
                    name: `${client.user.username}`,
                    iconURL: client.user.avatarURL(undefined, 128)
                },
                description
            }],
            components: <>
                <ActionRow>
                    <Button style={ButtonStyles.LINK} url={gitRemote}>Source Code</Button>
                </ActionRow>
            </>
        });
    }
});
