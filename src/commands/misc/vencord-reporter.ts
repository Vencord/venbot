import { defineCommand } from "~/Commands";
import Config from "~/config";
import { BotState } from "~/db/botState";
import { DefaultReporterBranch, ReporterOptions, testDiscordVersion } from "~/modules/discordTracker";
import { getEmoji } from "~/modules/emojiManager";
import { reply } from "~/util/discord";

const PrRegex = /#(\d+)/;

defineCommand({
    enabled: Config.reporter.enabled,

    name: "reporter",
    description: "Run the Vencord reporter workflow",
    usage: "[ref = dev] [branch = both]",
    aliases: ["report", "vencord-reporter", "test-patches", "test"],
    allowedRoles: [Config.roles.mod],

    async execute({ msg }, ref = DefaultReporterBranch, branch = "both") {
        const options: ReporterOptions = { ref };

        if (PrRegex.test(ref)) {
            const prNumber = parseInt(ref.match(PrRegex)![1]);

            options.ref = DefaultReporterBranch;
            options.inputRepository = "Vencord/Vencord";
            options.inputRef = `refs/pull/${prNumber}/head`;
        }

        testDiscordVersion(
            branch as any,
            {
                stable: BotState.discordTracker?.stableHash!,
                canary: BotState.discordTracker?.canaryHash!
            },
            {
                ...options,
                shouldLog: false,
                shouldUpdateStatus: options.ref === DefaultReporterBranch,
                onSubmit: (_report, data) => {
                    reply(msg, data);
                }
            }
        );

        reply(msg, "Now testing! " + getEmoji("shipit"));
    },
});
