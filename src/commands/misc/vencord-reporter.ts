import { defineCommand } from "~/Commands";
import { BotState } from "~/db/botState";
import { DefaultReporterBranch, testDiscordVersion } from "~/modules/discordTracker";
import { getEmoji } from "~/modules/emojiManager";
import { reply } from "~/util/discord";

defineCommand({
    name: "reporter",
    description: "Run the Vencord reporter workflow",
    usage: "[ref = dev] [branch = both]",
    aliases: ["report", "vencord-reporter", "test-patches", "test"],
    modOnly: true,

    async execute({ msg }, ref = DefaultReporterBranch, branch = "both") {
        testDiscordVersion(
            branch as any,
            {
                stable: BotState.discordTracker?.stableHash!,
                canary: BotState.discordTracker?.canaryHash!
            },
            {
                ref,
                shouldLog: false,
                shouldUpdateStatus: ref === DefaultReporterBranch,
                onSubmit: (_report, data) => {
                    reply(msg, data);
                }
            }
        );

        reply(msg, "Now testing! " + getEmoji("shipit"));
    },
});
