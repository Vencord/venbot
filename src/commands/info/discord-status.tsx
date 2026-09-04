import { SeparatorSpacingSize } from "oceanic.js";
import { defineCommand } from "~/Commands";
import { handleError } from "~/index";
import { fetchJson } from "~/util/fetch";
import { toTitle } from "~/util/text";
import { ComponentMessage, Container, Section, Separator, TextDisplay, Thumbnail } from "~components";

const statusEmoji = (status: string) => {
    switch (status) {
        case "operational":
            return "🟢";
        case "degraded_performance":
            return "🟡";
        case "partial_outage":
            return "🟠";
        case "major_outage":
            return "🔴";
        default:
            return "⚪";
    }
};

const impactEmoji = (impact: string) => {
    switch (impact) {
        case "none":
            return "⚫";
        case "maintenance":
            return "🟡";
        case "minor":
            return "🟡";
        case "major":
            return "🟠";
        case "critical":
            return "🔴";
        default:
            return "⚫";
    }
};

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
        .map(c => `### ${statusEmoji(c.status)} ${toTitle(c.status)}`)
        .join("\n") || `### ${statusEmoji("operational")} All Systems Operational`;

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

            return `### ${impactEmoji(i.impact)} [${i.name}](https://discordstatus.com/incidents/${i.id})\n${updates}`;
        })
        .join("\n\n") || null;

    return (
        <ComponentMessage>
            <Container>
                <Section accessory={<Thumbnail url="https://cdn.discordapp.com/embed/avatars/0.png" />}>
                    <TextDisplay>## Discord Status</TextDisplay>
                    <TextDisplay>{systemStatus}</TextDisplay>
                </Section>

                {systemOutages && (
                    <>
                        <Separator spacing={SeparatorSpacingSize.LARGE} />
                        <TextDisplay>{systemOutages}</TextDisplay>
                    </>
                )}

                <Separator spacing={SeparatorSpacingSize.LARGE} />
                <TextDisplay>-# Powered by [Discord Status](https://discordstatus.com/)</TextDisplay>
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
