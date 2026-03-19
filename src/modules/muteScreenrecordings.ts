import { mkdtemp, readFile, rm } from "fs/promises";
import { Message } from "oceanic.js";
import { tmpdir } from "os";
import { join } from "path";

import { Vaius } from "~/Client";
import { execFileP } from "~/util/childProcess";
import { reply } from "~/util/discord";
import { downloadToFile } from "~/util/fetch";

const UsersToMute = ["521819891141967883"];

async function hasAudio(file: string) {
    const res = await execFileP("ffprobe", ["-i", file, "-show_streams", "-select_streams", "a", "-loglevel", "error"]);

    const stdout = res.stdout.trim();
    if (!stdout.length) return false;

    const durationString = stdout.split("\n").find(line => line.startsWith("duration="))?.split("=")[1];
    if (!durationString) return false;

    const silenceRes = await execFileP("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=n=-50dB:d=0.5", "-f", "null", "/dev/null"]);
    const silenceStderr = silenceRes.stderr.trim();

    const silenceDurationString = silenceStderr.match(/silence_duration: (\d+(?:\.\d+)?)/);
    if (!silenceDurationString) return false;

    const silenceDuration = parseFloat(silenceDurationString[1]);
    const duration = parseFloat(durationString);

    if (isNaN(silenceDuration) || isNaN(duration)) return false;

    return Math.floor(duration - silenceDuration) > 1;
}

async function muteVideo(file: string, outFile: string) {
    const res = await execFileP("ffmpeg", ["-i", file, "-c", "copy", "-an", outFile]);
    return res.stdout.trim();
}

function getVideoInfo(msg: Message) {
    const attachment = msg.attachments.first()!;
    if (attachment.contentType?.includes("video")) {
        return {
            url: attachment.url,
            filename: attachment.filename
        };
    }

    const embed = msg.embeds[0];
    if (embed?.type === "video" && embed.video?.url) {
        const filename = new URL(embed.video.url).pathname.split("/").pop() || "video.mp4";
        return {
            url: embed.video.url,
            filename
        };
    }
}

Vaius.on("messageCreate", async msg => {
    if (!msg.inCachedGuildChannel()) return;

    if (!UsersToMute.includes(msg.author.id)) return;

    const video = getVideoInfo(msg);
    if (!video) return;

    const tempDir = await mkdtemp(join(tmpdir(), "vaius-mute-"));
    try {
        const file = join(tempDir, video.filename);
        const mutedFile = join(tempDir, "muted-" + video.filename);

        await downloadToFile(video.url, file);

        if (!await hasAudio(file)) return;

        await muteVideo(file, mutedFile);

        await reply(msg, {
            content: `From ${msg.author.mention} (video muted):\n\n${msg.content.replaceAll(video.url, "<$&>")}`,
            files: [{
                contents: await readFile(mutedFile),
                name: video.filename
            }]
        });
        await msg.delete();
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});
