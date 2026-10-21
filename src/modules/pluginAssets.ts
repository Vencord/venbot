import { createHash } from "crypto";
import { createReadStream } from "fs";
import { copyFile, mkdir, mkdtemp, rm, stat } from "fs/promises";
import { Attachment } from "oceanic.js";
import { homedir, tmpdir } from "os";
import { extname, join, resolve, sep } from "path";
import { pipeline } from "stream/promises";

import { Emoji } from "~/constants";
import { OwnerId } from "~/owner";
import { execFileP } from "~/util/childProcess";
import { reply } from "~/util/discord";
import { downloadToFile } from "~/util/fetch";
import { silently } from "~/util/functions";
import { Vaius } from "~/Vaius";

const CHANNEL_ID = "1076188996465590282";
// you should clone https://github.com/Vencord/plugin-assets in the same dir you cloned the bot.
// i recommend cloning with repo scoped PAT for better security
// git clone https://USER:PAT@github.com/Vencord/plugin-assets
// change identity:
// git config user.name shiggybot
// git config user.email 136832773+shiggybot@users.noreply.github.com
const FilesDir = join(homedir(), "plugin-assets");

const PluginNameRegex = /^[a-z0-9][a-z0-9._-]*$/i;
const AllowedExtensions = new Set([
    "png", "jpg", "jpeg", "gif", "webp",
    "mp4", "webm", "mov"
]);

function getExtension(filename: string) {
    const ext = extname(filename).slice(1).toLowerCase();
    return AllowedExtensions.has(ext) ? ext : null;
}

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


    const ext = getExtension(attachment.filename);
    if (!ext)
        return silently(msg.createReaction(Emoji.QuestionMark));

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

const formatFileName = (oldName: string) => `input.${extname(oldName).slice(1)}`;

async function optimiseImage(d: MediaParams) {
    const filename = formatFileName(d.filename);

    const binary = d.mime.startsWith("image/gif") ? "gif2webp" : "cwebp";
    await execFileP(binary, [filename, "-o", "output.webp"], {
        cwd: d.directory
    });

    return pickBetter(d.directory, filename, "output.webp");
}

async function optimiseVideo(d: MediaParams) {
    const filename = formatFileName(d.filename);

    const ffmpegArgs = ["-i", filename, "-b:v", "0", "-crf", "30"];
    await execFileP("ffmpeg", [...ffmpegArgs, "-pass", "1", "-an", "-f", "webm", "-y", "/dev/null"], {
        cwd: d.directory
    });
    await execFileP("ffmpeg", [...ffmpegArgs, "-pass", "2", "output.webm"], {
        cwd: d.directory
    });

    return pickBetter(d.directory, filename, "output.webm");
}


async function downloadToTempFile(attachment: Attachment, ext: string) {
    const dir = await mkdtemp(join(tmpdir(), "venbot-"));
    const cleanup = () => rm(dir, { recursive: true });

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
    if (!PluginNameRegex.test(pluginName))
        throw new Error(`Invalid plugin name: ${pluginName}`);

    const base = resolve(FilesDir);
    const dir = resolve(base, pluginName);
    if (dir !== base && !dir.startsWith(base + sep))
        throw new Error(`Invalid plugin path: ${pluginName}`);

    await mkdir(dir, { recursive: true });

    const hash = createHash("md5");
    const stream = createReadStream(file);
    await pipeline(stream, hash);
    const hashString = hash.digest("hex");

    const ext = extname(file).slice(1);
    const newFileName = join(pluginName, `${hashString}.${ext}`);
    const name = resolve(base, newFileName);
    if (!name.startsWith(base + sep))
        throw new Error(`Invalid asset path: ${newFileName}`);

    await copyFile(file, name);

    const git = (...args: string[]) => execFileP("git", args, { cwd: FilesDir });
    await git("add", newFileName);
    await git("commit", "--no-gpg-sign", "-m", `Add ${pluginName} assets ~ ${author}`);
    await git("push");

    return `Here you go: https://raw.githubusercontent.com/Vencord/plugin-assets/main/${newFileName}`;
}
