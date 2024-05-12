import leven from "leven";

import { defineCommand } from "../Command";
import { VENCORD_SITE } from "../constants";
import { makeCachedJsonFetch, reply } from "../util";
import { stripIndent } from "../util/text";

interface Plugin {
    name: string;
    description: string;
    authors: { name: string; id: string }[];

    target?: "desktop" | "discordDesktop" | "web" | "dev";

    required: boolean;
    enabledByDefault: boolean;

    hasPatches: boolean;
    hasCommands: boolean;
}

const fetchPlugins = makeCachedJsonFetch<Plugin[]>(
    VENCORD_SITE + "/plugins.json"
);

defineCommand({
    name: "plugin",
    aliases: ["viewplugin", "p"],
    description: "Provides information on a plugin",
    usage: "<plugin name>",
    guildOnly: true,
    rawContent: true, // since we just want the plugin name, and at least one has spaces
    async execute(msg, query) {
        if (!msg.inCachedGuildChannel()) return;

        if (!query) return reply(msg, { content: "Gimme a plugin name silly" });

        const plugins = await fetchPlugins();

        const match = (() => {
            if (!query) return;

            query = query.toLowerCase();
            return plugins.find(p => p.name.toLowerCase().includes(query));
        })();

        if (match) {
            const abilities = stripIndent`
                ${match.required ? "`*️⃣` required" : ""}
                ${match.enabledByDefault ? "`✅` enabled by default" : ""}
                ${match.hasCommands ? "`💬` has chat commands" : ""}
                ${match.target === "desktop" ? "`🖥️` desktop only" : ""}
                ${match.target === "discordDesktop"
                    ? "`🍦` discord desktop only"
                    : ""
                }
                ${match.target === "web" ? "`🌐` web only" : ""}
                ${match.target === "dev" ? "`🧩` development build only" : ""}
            `.replace(/^\s*\n/gm, ""); // remove blanks

            return reply(msg, {
                embeds: [
                    {
                        title: match.name,
                        description: match.description,
                        url: `https://vencord.dev/plugins/${encodeURIComponent(
                            match.name
                        )}`,
                        color: 0xdd7878,
                        fields: [
                            {
                                name: "Authors",
                                value: match.authors
                                    .map(a => a.name)
                                    .join(", "),
                            },
                            {
                                name: "Abilities",
                                value: abilities || "`❌` no special abilities",
                            },
                        ],
                    },
                ],
            });
        }

        // find plugins with similar names, in case of minor typos
        const similarPlugins = plugins
            .map(p => ({
                name: p.name,
                distance: leven(p.name.toLowerCase(), query.toLowerCase()),
            }))
            .filter(p => p.distance <= 3)
            .sort((a, b) => a.distance - b.distance);

        if (similarPlugins.length > 0) {
            return reply(msg, {
                content: `Couldn't quite find the plugin you were looking for. Did you mean...\n${similarPlugins
                    .map(p => `- ${p.name}`)
                    .join("\n")}`,
            });
        }

        return reply(msg, {
            content:
                "Couldn't find a plugin with that name, and there are no plugins with similar names.",
        });
    },
});
