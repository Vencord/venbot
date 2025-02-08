import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { Vaius } from "~/Client";
import { Millis } from "~/constants";
import { GITHUB_WORKFLOW_DISPATCH_PAT, HTTP_DOMAIN, REPORTER_WEBHOOK_SECRET } from "~/env";
import { fastify } from "~/server";
import { doFetch } from "~/util/fetch";
import { TTLMap } from "~/util/TTLMap";

type Branch = "stable" | "canary";

interface VersionData {
    hash: string;
    required: boolean;
}

interface ReportData {
    branch: Branch;
    hash: string;
}

const LogChannelId = "1337479880849362994";
const StatusChannelId = "1337479816240431115";
const StableMessageId = "1337500395311992954";
const CanaryMessageId = "1337500381923774544";

let canaryHash: string;
let stableHash: string;

const pendingReports = new TTLMap<string, ReportData>(
    10 * Millis.MINUTE,
    (_id, report) => Vaius.rest.channels.createMessage(LogChannelId, {
        content: `Timed out while testing ${report.branch} ${report.hash}`,
    })
);

setInterval(checkVersions, 30 * Millis.SECOND);
checkVersions();

export async function triggerReportWorkflow({ ref, inputs }: { ref: string, inputs: { discord_branch: "both" | Branch; webhook_url?: string; } }) {
    return await doFetch("https://api.github.com/repos/Vendicated/Vencord/actions/workflows/reportBrokenPlugins.yml/dispatches", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GITHUB_WORKFLOW_DISPATCH_PAT}`,
        },
        body: JSON.stringify({
            ref,
            inputs
        })
    });
}

async function fetchHash(url: string) {
    return doFetch(url)
        .then(res => res.json<VersionData>())
        .then(json => json.hash);
}

async function checkVersions() {
    const [stable, canary] = await Promise.all([
        fetchHash("https://discord.com/assets/version.stable.json"),
        fetchHash("https://canary.discord.com/assets/version.canary.json"),
    ]);

    stableHash ??= stable;
    canaryHash ??= canary;

    if (stableHash !== stable) {
        console.log("Stable version updated:", stableHash, "->", stable);
        stableHash = stable;
        testVersion("stable", stable);
    }

    if (canaryHash !== canary) {
        console.log("Canary version updated:", canaryHash, "->", canary);
        canaryHash = canary;
        testVersion("canary", canary);
    }
}

async function testVersion(branch: "stable" | "canary", hash: string) {
    const id = randomUUID();
    pendingReports.set(id, {
        branch,
        hash
    });

    await triggerReportWorkflow({
        ref: "reporter-webhook-option",
        inputs: {
            discord_branch: branch,
            webhook_url: `${HTTP_DOMAIN}/reporter/webhook?runId=${id}`
        }
    });
}

async function handleReportSubmit(report: ReportData, data: any) {
    data = {
        ...data,
        allowedMentions: { parse: [] }
    };
    // trolley
    data.embeds[0].author.iconURL = data.embeds[0].author?.icon_url;

    Vaius.rest.channels.createMessage(LogChannelId, data);

    const latestHash = report.branch === "canary" ? canaryHash : stableHash;
    if (latestHash !== report.hash) {
        return;
    }

    const messageId = report.branch === "canary" ? CanaryMessageId : StableMessageId;

    Vaius.rest.channels.editMessage(StatusChannelId, messageId, data);
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
        runId: { type: "string" }
    }
};

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

        const mac = createHmac("sha256", REPORTER_WEBHOOK_SECRET)
            .update(data)
            .digest();
        const expected = Buffer.from(signature.replace("sha256=", ""), "hex");

        if (!timingSafeEqual(mac, expected)) {
            res.status(401).send("Invalid X-Signature");
            return;
        }

        pendingReports.delete(runId);
        await handleReportSubmit(report, JSON.parse(data));

        res.status(200).send();
    });
}, {
    prefix: "/reporter"
});
