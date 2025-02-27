import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { Vaius } from "~/Client";
import { execFile } from "~/util/childProcess";
import { reply } from "~/util/discord";
import { downloadToFile } from "~/util/fetch";

const UsersToMute = ["521819891141967883"];

async function hasAudio(file: string) {
    const res = await execFile("ffprobe", ["-i", file, "-show_streams", "-select_streams", "a", "-loglevel", "error"]);
    return res.stdout.trim().length > 0;
}

async function muteVideo(file: string, outFile: string) {
    const res = await execFile("ffmpeg", ["-i", file, "-c", "copy", "-an", outFile]);
    return res.stdout.trim();
}

Vaius.on("messageCreate", async msg => {
    if (!msg.inCachedGuildChannel()) return;

    const attachment = msg.attachments.first()!;
    if (msg.attachments.size !== 1) return;
    if (!["video/webm", "video/mp4"].includes(attachment?.contentType || "")) return;

    if (!UsersToMute.includes(msg.author.id)) return;

    const tempDir = await mkdtemp(join(tmpdir(), "vaius-mute-"));
    try {
        const file = join(tempDir, attachment.filename);
        const mutedFile = join(tempDir, "muted-" + attachment.filename);

        await downloadToFile(attachment.url, file);

        if (!await hasAudio(file)) return;

        await muteVideo(file, mutedFile);

        await reply(msg, {
            content: `From ${msg.author.mention} (video muted):\n\n${msg.content}`,
            files: [{
                contents: await readFile(mutedFile),
                name: attachment.filename
            }]
        });
        await msg.delete();
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
});
