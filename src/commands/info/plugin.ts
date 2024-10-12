import leven from "leven";
import { AnyTextableChannel, Message } from "oceanic.js";

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

function sendPluginInfo(msg: Message<AnyTextableChannel>, plugin: Plugin) {
    const traits = [
        plugin.required && `${Emojis.Required} required`,
        plugin.enabledByDefault && `${Emojis.EnabledByDefault} enabled by default`,
        plugin.hasCommands && `${Emojis.HasCommands} has chat commands`,
        plugin.target === "desktop" && `${Emojis.Desktop} desktop only`,
        plugin.target === "discordDesktop" && `${Emojis.DiscordDesktop} discord desktop only`,
        plugin.target === "web" && `${Emojis.Web} web only`,
        plugin.target === "dev" && `${Emojis.Dev} development build only`
    ].filter(isTruthy).join("\n");

    return reply(msg, {
        embeds: [
            {
                title: plugin.name,
                description: plugin.description,
                url: `https://vencord.dev/plugins/${encodeURIComponent(
                    plugin.name
                )}`,
                color: 0xdd7878,
                fields: [
                    {
                        name: "Authors",
                        value: plugin.authors
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

defineCommand({
    name: "plugin",
    aliases: ["viewplugin", "p"],
    description: "Provides information on a plugin",
    usage: "<plugin name>",
    rawContent: true, // since we just want the plugin name, and at least one has spaces
    async execute(msg, query) {
        if (!msg.inCachedGuildChannel()) return;

        if (!query) return reply(msg, "Gimme a plugin name silly");

        if (query.toLowerCase() === "shiggy")
            return reply(msg, "https://cdn.discordapp.com/emojis/1024751291504791654.gif?size=48&quality=lossless&name=shiggy");


        const plugins = await fetchPlugins();

        const match = (() => {
            if (!query) return;

            query = query.toLowerCase();
            return plugins.find(p => p.name.toLowerCase().includes(query));
        })();

        if (match)
            return sendPluginInfo(msg, match);

        // find plugins with similar names, in case of minor typos
        const similarPlugins = plugins
            .map(p => ({
                name: p.name,
                distance: leven(p.name.toLowerCase(), query.toLowerCase()),
            }))
            .filter(p => p.distance <= 3)
            .sort((a, b) => a.distance - b.distance);

        if (similarPlugins.length === 1)
            return sendPluginInfo(msg, plugins.find(p => p.name === similarPlugins[0].name)!);

        if (similarPlugins.length > 0) {
            const suggestions = similarPlugins
                .map(p => `- ${p.name}`)
                .join("\n");

            return reply(
                msg,
                `Couldn't quite find the plugin you were looking for. Did you mean...\n${suggestions}`
            );
        }

        return reply(msg, "Couldn't find a plugin with that name, and there are no plugins with similar names.");
    },
});
