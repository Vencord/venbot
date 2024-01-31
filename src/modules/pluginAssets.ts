import { createHash } from "crypto";
import { createReadStream } from "fs";
import { copyFile, mkdir, mkdtemp, rmdir, stat } from "fs/promises";
import { Attachment } from "oceanic.js";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";

import { OwnerId, Vaius } from "../Client";
import { Emoji } from "../constants";
import { reply, silently } from "../util";
import { exec, execFile } from "../util/childProcess";
import { downloadToFile } from "../util/fetch";

const CHANNEL_ID = "1076188996465590282";
// you should clone https://github.com/Vencord/plugin-assets in the same dir you cloned the bot.
// i recommend cloning with repo scoped PAT for better security
// git clone https://USER:PAT@github.com/Vencord/plugin-assets
// change identity:
// git config user.name shiggybot
// git config user.email 136832773+shiggybot@users.noreply.github.com
const FilesDir = "../plugin-assets";

interface MediaParams {
    directory: string;
    filename: string;
    mime: string;
}

Vaius.on("messageCreate", async msg => {
    if (msg.channelID !== CHANNEL_ID || msg.author.id !== OwnerId) return;

    const pluginName = msg.content;
    const attachment = msg.attachments.first();
    if (!pluginName || !attachment?.contentType)
        return silently(msg.createReaction(Emoji.QuestionMark));

    const isImage = attachment.contentType.startsWith("image/");
    const isVideo = attachment.contentType.startsWith("video/");
    if (!isImage && !isVideo)
        return silently(msg.createReaction(Emoji.QuestionMark));


    const ext = attachment.filename.split(".").pop()!;

    const { directory, filename, cleanup } = await downloadToTempFile(attachment, ext);

    try {
        const optimise = isImage ? optimiseImage : optimiseVideo;
        const outputFile = await optimise({ directory, filename, mime: attachment.contentType });

        const file = join(directory, outputFile);
        const res = await writeAsset(pluginName, file, `${msg.author.tag} (${msg.author.id})`);
        reply(msg, res);
    } catch (e) {
        console.error(e);
        reply(msg, "Something went wrong :(");
    } finally {
        cleanup();
    }
});

const formatFileName = (oldName: string) => `input.${oldName.split(".").pop()}`;

async function optimiseImage(d: MediaParams) {
    const filename = formatFileName(d.filename);

    const binary = d.mime.startsWith("image/gif") ? "gif2webp" : "cwebp";
    await execFile(binary, [filename, "-o", "output.webp"], {
        cwd: d.directory
    });

    return pickBetter(d.directory, filename, "output.webp");
}

async function optimiseVideo(d: MediaParams) {
    const filename = formatFileName(d.filename);

    const cmd =
        `ffmpeg -i ${filename} -b:v 0 -crf 30 -pass 1 -an -f webm -y /dev/null`
        + `&& ffmpeg  -i ${filename} -b:v 0 -crf 30 -pass 2 output.webm`;

    await exec(cmd, {
        cwd: d.directory
    });

    return pickBetter(d.directory, filename, "output.webm");
}


async function downloadToTempFile(attachment: Attachment, ext: string) {
    const dir = await mkdtemp(join(tmpdir(), "venbot-"));
    const cleanup = () => rmdir(dir, { recursive: true });

    const filename = `input.${ext}`;

    try {
        await downloadToFile(attachment.url, join(dir, filename));
    } catch (e) {
        cleanup();
        throw e;
    }

    return {
        filename,
        directory: dir,
        cleanup
    };
}

async function pickBetter(dir: string, oldName: string, newName: string) {
    const oldStats = await stat(join(dir, oldName));
    const newStats = await stat(join(dir, newName));

    return oldStats.size - newStats.size > 10_000
        ? newName
        : oldName;
}

async function writeAsset(pluginName: string, file: string, author: string) {
    const dir = join(FilesDir, pluginName);
    await mkdir(dir, { recursive: true });

    const hash = createHash("md5");
    const stream = createReadStream(file);
    await pipeline(stream, hash);
    const hashString = hash.digest("hex");

    const ext = file.split(".").pop()!;
    const newFileName = join(pluginName, `${hashString}.${ext}`);

    const name = join(FilesDir, newFileName);
    await copyFile(file, name);

    const git = (...args: string[]) => execFile("git", args, { cwd: FilesDir });
    await git("add", newFileName);
    await git("commit", "--no-gpg-sign", "-m", `Add ${pluginName} assets ~ ${author}`);
    await git("push");

    return `Here you go: https://raw.githubusercontent.com/Vencord/plugin-assets/main/${newFileName}`;
}
