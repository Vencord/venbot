import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { GITHUB_WORKFLOW_DISPATCH_PAT } from "~/env";
import { doFetch } from "~/util/fetch";

defineCommand({
    name: "reporter",
    description: "Run the Vencord reporter workflow",
    usage: "[ref = dev]",
    aliases: ["report", "vencord-reporter", "test-patches", "test"],
    modOnly: true,

    async execute({ reply }, ref = "dev") {
        await doFetch("https://api.github.com/repos/Vendicated/Vencord/actions/workflows/reportBrokenPlugins.yml/dispatches", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GITHUB_WORKFLOW_DISPATCH_PAT}`,
            },
            body: JSON.stringify({
                ref,
            })
        });

        reply("Now testing! " + Emoji.ShipIt);
    },
});
