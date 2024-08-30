import leven from "leven";

import { defineCommand } from "~/Commands";
import { VENCORD_SITE } from "~/constants";
import { makeCachedJsonFetch, reply } from "~/util";
import { isTruthy } from "~/util/guards";

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

const Emojis = {
    Required: "<:required:1240029454701563925>",
    EnabledByDefault: "<:enabledByDefault:1240029457218015332>",
    HasCommands: "<:hasCommands:1240029456157114460>",
    Desktop: "<:desktop:1240029460762464276>",
    DiscordDesktop: "<:discordDesktop:1240029458266591283>",
    Vesktop: "<:vesktop1240029451690184728>",
    Web: "<:web:1240029453665570887>",
    Dev: "<:dev:1240029459449512029>",
};

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
            const traits = [
                match.required && `${Emojis.Required} required`,
                match.enabledByDefault && `${Emojis.EnabledByDefault} enabled by default`,
                match.hasCommands && `${Emojis.HasCommands} has chat commands`,
                match.target === "desktop" && `${Emojis.Desktop} desktop only`,
                match.target === "discordDesktop" && `${Emojis.DiscordDesktop} discord desktop only`,
                match.target === "web" && `${Emojis.Web} web only`,
                match.target === "dev" && `${Emojis.Dev} development build only`
            ].filter(isTruthy).join("\n");

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
                            traits && {
                                name: "Traits",
                                value: traits,
                            },
                        ].filter(isTruthy),
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
