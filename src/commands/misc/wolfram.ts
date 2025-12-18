import { defineCommand } from "~/Commands";
import Config from "~/config";
import { toCodeblock } from "~/util/text";

defineCommand({
    enabled: !!Config.wolfram.appId,
    name: "wolfram",
    aliases: ["wa", "wolframalpha"],
    description: "Query Wolfram Alpha for computational knowledge.",
    usage: "<query>",
    rawContent: true,
    async execute({ reply }, input) {
        const url = "https://api.wolframalpha.com/v1/result?" + new URLSearchParams({
            i: input,
            appid: Config.wolfram.appId,
        });

        const result = await fetch(url)
            .then(res => res.text())
            .catch(() => "No result");

        return reply({
            embeds: [{
                author: {
                    name: input,
                    iconURL: "https://www.google.com/s2/favicons?domain=www.wolframalpha.com&sz=128",
                },
                description: toCodeblock(result),
            }],
        });
    }
});
