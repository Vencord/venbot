import { readFileSync } from "fs";
import { join } from "path";

import { parse as parseToml } from "toml";
import { array, boolean, check, getDotPath, integer, maxValue, minLength, minValue, number, object, optional, picklist, pipe, record, safeParse, string, type InferOutput, type ObjectEntries } from "valibot";

const configPath = join(__dirname, "..", "config.toml");

const optionalString = () => optional(string(), "");

const getMissingKeys = (input: Record<string, unknown>, entries: ObjectEntries) =>
    Object.keys(entries).filter(key => input[key] === "" || input[key] === undefined);

function enabledConfig<const TEntries extends ObjectEntries>(entries: TEntries) {
    return pipe(
        object({ enabled: boolean(), ...entries }),
        check(
            input => !input.enabled || getMissingKeys(input, entries).length === 0,
            issue => `Missing required values for enabled module: ${getMissingKeys(issue.input as Record<string, unknown>, entries).join(", ")}`
        )
    );
}

const ConfigSchema = pipe(
    object({
        token: pipe(string(), minLength(1)),
        prefixes: array(string()),
        homeGuildId: string(),
        mode: picklist(["development", "production"]),

        channels: object({
            autoModLog: optionalString(),
            modLog: optionalString(),
            botAuditLog: optionalString(),
            dev: string(),
            support: string(),
            supportAllowedChannels: optional(array(string()), [])
        }),

        moderation: object({
            inviteAllowedGuilds: optional(array(string()), [])
        }),

        roles: object({
            mod: string(),
            helper: string(),
            donor: string(),
            contributor: string(),
            cotd: string(),
            legacyCotd: string(),
            manageableRoles: optional(array(string()), []),
            modmailAssignableRoles: optional(array(string()), [])
        }),

        rules: enabledConfig({
            rulesChannelId: optionalString()
        }),

        knownIssues: enabledConfig({
            knownIssuesForumId: optionalString()
        }),

        submissionPass: enabledConfig({
            categoryId: optionalString(),
            passRoleId: optionalString()
        }),

        gemini: enabledConfig({
            apiKey: optionalString(),
            allowedRoles: optional(array(string()), []),
            bannedRoles: optional(array(string()), [])
        }),

        modmail: enabledConfig({
            channelId: optionalString(),
            logChannelId: optionalString(),
            modRoleId: optionalString(),
            banRoleId: optionalString()
        }),

        httpServer: enabledConfig({
            port: optional(pipe(number(), integer(), minValue(1), maxValue(65535)), 8152),
            domain: optionalString()
        }),

        githubLinking: enabledConfig({
            clientId: optionalString(),
            clientSecret: optionalString(),
            pat: optionalString()
        }),

        adventOfCode: enabledConfig({
            cookie: optionalString(),
            channelId: optionalString(),
            leaderboardUrl: optionalString()
        }),

        reporter: enabledConfig({
            pat: optionalString(),
            webhookSecret: optionalString(),
            logChannelId: optionalString(),
            statusChannelId: optionalString(),
            stableMessageId: optionalString(),
            canaryMessageId: optionalString()
        }),

        googleProxy: object({
            url: optionalString(),
            secret: optionalString()
        }),

        wolfram: object({
            appId: optionalString()
        }),

        xp: object({
            eligibleCategories: optional(array(string()), []),
            rewards: optional(record(string(), string()), {})
        })
    }),
    check(
        input => !(input.githubLinking.enabled || input.reporter.enabled) || !!input.httpServer.domain,
        "httpServer.domain is required when githubLinking or reporter is enabled"
    )
);

function loadConfig(): InferOutput<typeof ConfigSchema> {
    let contents: string;
    try {
        contents = readFileSync(configPath, "utf-8");
    } catch {
        throw new Error(`Failed to read config at ${configPath}. Copy assets/examples/config.example.toml to config.toml and fill it out.`);
    }

    const result = safeParse(ConfigSchema, parseToml(contents));
    if (!result.success) {
        const issues = result.issues
            .map(issue => `${getDotPath(issue) ?? "<root>"}: ${issue.message}`)
            .join("\n");

        throw new Error(`Invalid config at ${configPath}:\n${issues}`);
    }

    return result.output;
}

const Config = loadConfig();

export default Config;
