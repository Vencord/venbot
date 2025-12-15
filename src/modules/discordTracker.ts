import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { EmbedOptions } from "oceanic.js";

import { Vaius } from "~/Client";
import Config from "~/config";
import { Millis } from "~/constants";
import { BotState } from "~/db/botState";
import { fastify } from "~/server";
import { doFetch } from "~/util/fetch";
import { TTLMap } from "~/util/TTLMap";

type Branch = "both" | "stable" | "canary";

interface VersionData {
    hash: string;
    required: boolean;
}

interface ReportData {
    runId: string;
    branch: Branch;
    hash: Partial<Record<"stable" | "canary", string>>;
    shouldLog: boolean;
    shouldUpdateStatus: boolean;
    onSubmit?(report: ReportData, data: any): void;
    submitCount: number;
}

export const DefaultReporterBranch = "dev";

const { canaryMessageId, enabled, logChannelId, pat, stableMessageId, statusChannelId, webhookSecret } = Config.reporter;

const pendingReports = new TTLMap<string, ReportData>(
    10 * Millis.MINUTE,
    (_id, report) => Vaius.rest.channels.createMessage(logChannelId, {
        content: `Timed out while testing ${report.branch} ${report.hash[report.branch] || "with unknown hash"}`,
    })
);

export async function triggerReportWorkflow({ ref, inputs }: { ref: string, inputs: { discord_branch: Branch; webhook_url?: string; }; }) {
    return await doFetch("https://api.github.com/repos/Vendicated/Vencord/actions/workflows/reportBrokenPlugins.yml/dispatches", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${pat}`,
        },
        body: JSON.stringify({
            ref,
            inputs
        })
    });
}

async function fetchHash(url: string) {
    return doFetch(url)
        .then(res => res.headers.get("x-build-id") ?? Promise.reject(new Error(`No x-build-id header found for ${url}`)));
}

async function checkVersions() {
    const [stable, canary] = await Promise.all([
        fetchHash("https://discord.com/app"),
        fetchHash("https://canary.discord.com/app"),
    ]);

    const versions = BotState.discordTracker ??= {
        stableHash: stable,
        canaryHash: canary
    };

    if (versions.stableHash !== stable) {
        versions.stableHash = stable;
        testDiscordVersion("stable", { stable });
    }

    if (versions.canaryHash !== canary) {
        versions.canaryHash = canary;
        testDiscordVersion("canary", { canary });
    }
}

type Options = Partial<Pick<ReportData, "shouldLog" | "shouldUpdateStatus" | "onSubmit">> & { ref?: string; };

export async function testDiscordVersion<B extends Branch>(branch: B, hash: Record<B extends "both" ? "stable" | "canary" : B, string>, options: Options = {}) {
    const {
        shouldLog = true,
        shouldUpdateStatus = true,
        ref = DefaultReporterBranch,
        onSubmit
    } = options;

    const runId = randomUUID();
    pendingReports.set(runId, {
        runId,
        branch,
        hash,
        shouldLog,
        shouldUpdateStatus,
        onSubmit,
        submitCount: 0
    });

    await triggerReportWorkflow({
        ref,
        inputs: {
            discord_branch: branch,
            webhook_url: `${Config.httpServer.domain}/reporter/webhook?runId=${runId}`
        }
    });
}

async function handleReportSubmit(report: ReportData, data: any) {
    const shouldRemoveFromPending = report.branch !== "both" || ++report.submitCount === 2;
    if (shouldRemoveFromPending) {
        pendingReports.delete(report.runId);
    }

    report = {
        ...report
    };

    if (report.branch === "both") {
        report.branch = data.embeds[0].author.name.includes("Canary") ? "canary" : "stable";
    }

    data = {
        ...data,
        allowedMentions: { parse: [] }
    };
    // trolley
    data.embeds[0].author.iconURL = data.embeds[0].author.icon_url;

    let descriptionTooLarge = false;
    const contentLength = data.embeds.reduce((total: number, embed: EmbedOptions) => {
        if (embed.description && embed.description.length > 4096) descriptionTooLarge = true;

        const lengths = [
            total,
            embed.title?.length || 0,
            embed.description?.length || 0,
            embed.author?.name?.length || 0,
            embed.footer?.text?.length || 0
        ];

        return lengths.reduce((a, b) => a + b, 0);
    }, 0);

    if (descriptionTooLarge || contentLength > 6000) {
        data.embeds.forEach((embed, i) => {
            if (i !== 0) {
                embed.description = "The report is too long to display here. Please check [on GitHub](https://github.com/Vendicated/Vencord/actions/workflows/reportBrokenPlugins.yml).";
            }
        });
    }

    report.onSubmit?.(report, data);

    if (report.shouldLog) {
        Vaius.rest.channels.createMessage(logChannelId, data);
    }

    const latestHash = report.branch === "canary"
        ? BotState.discordTracker!.canaryHash
        : BotState.discordTracker!.stableHash;

    if (!report.shouldUpdateStatus || latestHash !== report.hash[report.branch]) {
        return;
    }

    data.embeds[0].description = `Last updated: <t:${Math.round(Date.now() / 1000)}>`;

    const messageId = report.branch === "canary" ? canaryMessageId : stableMessageId;
    Vaius.rest.channels.editMessage(statusChannelId, messageId, data);
}

const schema = {
    headers: {
        type: "object",
        properties: {
            "x-signature": { type: "string" }
        },
        required: ["x-signature"]
    },
    querystring: {
        type: "object",
        properties: {
            runId: { type: "string" }
        }
    }
};

if (enabled) {
    setInterval(checkVersions, 30 * Millis.SECOND);
    checkVersions();

    fastify.register(async fastify => {
        // we need body as string instead of object to verify the signature
        fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
            done(null, body);
        });

        fastify.post("/webhook", { schema }, async (req, res) => {
            const { runId } = req.query as any;

            const report = pendingReports.get(runId);
            if (!report) {
                res.status(404).send("Unknown runId");
                return;
            }

            const data = req.body as string;
            const signature = req.headers["x-signature"] as string;

            const mac = createHmac("sha256", webhookSecret)
                .update(data)
                .digest();
            const expected = Buffer.from(signature.replace("sha256=", ""), "hex");

            if (!timingSafeEqual(mac, expected)) {
                res.status(401).send("Invalid X-Signature");
                return;
            }

            await handleReportSubmit(report, JSON.parse(data));

            res.status(200).send();
        });
    }, {
        prefix: "/reporter"
    });
}
