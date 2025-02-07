import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { triggerReportWorkflow } from "~/modules/discordTracker";

defineCommand({
    name: "reporter",
    description: "Run the Vencord reporter workflow",
    usage: "[ref = dev] [branch = both]",
    aliases: ["report", "vencord-reporter", "test-patches", "test"],
    modOnly: true,

    async execute({ reply }, ref = "dev", branch = "both") {
        await triggerReportWorkflow({ ref, inputs: { discord_branch: branch as any } });

        reply("Now testing! " + Emoji.ShipIt);
    },
});
