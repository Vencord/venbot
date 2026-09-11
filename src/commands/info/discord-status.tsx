import { SeparatorSpacingSize } from "oceanic.js";
import { defineCommand } from "~/Commands";
import { handleError } from "~/index";
import { getEmoji } from "~/modules/emojiManager";
import { fetchJson } from "~/util/fetch";
import { makeConstants } from "~/util/objects";
import { snakeToTitle, toInlineCode, toTitle } from "~/util/text";
import { ComponentMessage, Container, Separator, TextDisplay } from "~components";

const StatusEmoji = makeConstants({
    operational: "🟢",
    degraded_performance: "🟡",
    partial_outage: "🟠",
    major_outage: "🔴",
    default: "⚪"
});

const ImpactEmoji = makeConstants({
    none: "⚫",
    maintenance: "🟡",
    minor: "🟡",
    major: "🟠",
    critical: "🔴",
});

const getStatusEmoji = (status: string) => toInlineCode(StatusEmoji[status as keyof typeof StatusEmoji] ?? StatusEmoji.default);
const getImpactEmoji = (impact: string) => toInlineCode(ImpactEmoji[impact as keyof typeof ImpactEmoji] ?? ImpactEmoji.none);

interface DiscordComponentsResponse {
    components: Array<{
        id: string;
        name: string;
        status: string;
        description: string;
        position: number;
        created_at: string;
    }>;
}

interface DiscordIncidentsResponse {
    incidents: Array<{
        id: string;
        name: string;
        status: string;
        impact: string;
        incident_updates: Array<any>;
    }>;
}

async function getDiscordStatusComponents(): Promise<DiscordComponentsResponse | null> {
    return fetchJson("https://discordstatus.com/api/v2/components.json")
        .catch(e => handleError("Error fetching Discord components:", e));
}

async function getDiscordStatusIncidents(): Promise<DiscordIncidentsResponse | null> {
    return fetchJson("https://discordstatus.com/api/v2/incidents.json")
        .catch(e => handleError("Error fetching Discord incidents:", e));
}

async function buildStatusEmbed(components: DiscordComponentsResponse, incidents: DiscordIncidentsResponse) {
    const systemStatus = components.components
        .filter(c => c.status !== "operational")
        .map(c => `### ${getStatusEmoji(c.status)} ${snakeToTitle(c.status)}`)
        .join("\n") || `### ${getStatusEmoji("operational")} All Systems Operational`;

    const systemOutages = incidents.incidents
        .filter(i => i.status !== "resolved")
        .slice(0, 1)
        .map(i => {
            const updates = [...i.incident_updates]
                .reverse()
                .map(update =>
                    `**${toTitle(update.status)}** - ${update.body}\n<t:${Math.floor(new Date(update.created_at).getTime() / 1000)}:f>`
                )
                .join("\n\n");

            return `### ${getImpactEmoji(i.impact)} [${i.name}](https://discordstatus.com/incidents/${i.id})\n${updates}`;
        })
        .join("\n\n") || null;

    return (
        <ComponentMessage>
            <Container>
                <TextDisplay>## {getEmoji("discord_logo")} [Discord Status](https://discordstatus.com)</TextDisplay>
                <Separator spacing={SeparatorSpacingSize.SMALL} divider={false} />
                <TextDisplay>{systemStatus}</TextDisplay>

                {systemOutages && (
                    <>
                        <Separator spacing={SeparatorSpacingSize.LARGE} />
                        <TextDisplay>{systemOutages}</TextDisplay>
                    </>
                )}
            </Container>
        </ComponentMessage>
    );
}

defineCommand({
    name: "discord-status",
    aliases: ["dstatus", "ds"],
    description: "Check if discord incidents are happening",
    usage: null,
    async execute({ reply }) {
        const components = await getDiscordStatusComponents();
        const incidents = await getDiscordStatusIncidents();

        if (!components || !incidents) {
            return reply("Can't get discord status at the moment :c");
        }

        return reply(await buildStatusEmbed(components, incidents));
    }
});
