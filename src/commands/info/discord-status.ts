import { defineCommand } from "~/Commands";
import { reply } from "~/util";
import { fetchJson } from "~/util/fetch";
import { stripIndent, toTitle } from "~/util/text";

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
        created_at: string
    }>;
}

interface DiscordIncdentsResponse {
    incidents: Array<{
        id: string;
        name: string;
        status: string;
        impact: string;
        incident_updates: Array<any>;
    }>;
}

defineCommand({
    name: "discord-status",
    aliases: ["dstatus", "ds"],
    description: "Check if discord incendents are happening",
    usage: null,
    async execute(msg) {
        const components = await getDiscordStatusComponents();
        const incidents = await getDiscordStatusIncidents();

        if (!components || !incidents) {
            return reply(msg, "Can't get discord status at the moment :c");
        }

        const systemStatus = components.components
            .filter(c =>
                [
                    "API",
                    "Media Proxy",
                    "Push Notifications",
                    "Search",
                    "Voice",
                    "Gateway",
                ].includes(c.name)
            )
            .map(c => `${statusEmoji(c.status)} **${c.name}**: ${toTitle(c.status)}`)
            .join("\n");

        const systemOutages = incidents.incidents
            .filter(i => i.status !== "resolved")
            .map(i => {
                const identifiedUpdate = i.incident_updates.find(update => update.status === "identified");

                return stripIndent`
                    **Incident:** ${impactEmoji(i.impact)} ${i.name}
                    **Status:** 🔴 ${toTitle(i.status)}
                    **Identified At:** ${identifiedUpdate ? `<t:${Math.floor(new Date(identifiedUpdate.created_at).getTime() / 1000)}:F>` : "N/A"}
                    **Last Updated:** <t:${Math.floor(new Date(i.incident_updates[0].updated_at).getTime() / 1000)}:F>\n
                `;
            })
            .join("\n");

        const systemOutagesText =
            `\n### Latest Outage Information\n${systemOutages}`;

        return reply(msg, {
            embeds: [{
                title: "Discord Status",
                color: 0x5865F2,
                description: systemStatus + systemOutagesText,
            }],
        });
    }
});

async function getDiscordStatusComponents(): Promise<DiscordComponentsResponse | null> {
    return fetchJson("https://discordstatus.com/api/v2/components.json")
        .catch(e => console.error("Error fetching Discord components:", e));
}

async function getDiscordStatusIncidents(): Promise<DiscordIncdentsResponse | null> {
    return fetchJson("https://discordstatus.com/api/v2/incidents.json")
        .catch(e => console.error("Error fetching Discord incidents:", e));
}
