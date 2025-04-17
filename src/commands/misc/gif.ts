import { Canvas, createCanvas, Image, ImageData, loadImage } from "@napi-rs/canvas";
import { readdirSync } from "fs";
import { readFile } from "fs/promises";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { decompressFrames, parseGIF } from "gifuct-js";
import { Member, User } from "oceanic.js";
import { join } from "path";
import { format } from "util";

import { defineCommand } from "~/Commands";
import { ASSET_DIR } from "~/constants";
import { resolveUser } from "~/util/resolvers";

type TemplateConfig = typeof import("../../../assets/image-gen/gif-templates/hammer/config.json");

interface Template {
    config: TemplateConfig;
    frames: Image[];
}

const templateDir = join(ASSET_DIR, "image-gen/gif-templates");
const templates = readdirSync(templateDir);

templates.push("jumpscare");

const templateCache = new Map<string, Template>();

async function loadTemplate(name: string) {
    let template = templateCache.get(name);
    if (!template) {
        const dir = join(templateDir, name);

        const config: TemplateConfig = JSON.parse(await readFile(join(dir, "config.json"), "utf-8"));
        const frames = await Promise.all(Array.from({ length: config.frames }, (_, i) => loadImage(join(dir, `frame-${i}.png`))));
        template = { config, frames };
        templateCache.set(name, template);
    }

    return template;
}

type AvatarFrameProvider = (index: number) => Image | Canvas;

async function makeAvatarProvider(user: User | Member): Promise<AvatarFrameProvider> {
    const isGif = user.avatar?.startsWith("a_");
    const avatarUrl = user.avatarURL(isGif ? "gif" : "png", 256);
    const buf = await fetch(avatarUrl).then(res => res.arrayBuffer());

    if (!isGif) {
        const img = await loadImage(buf);
        return (index: number) => img;
    }

    const gif = parseGIF(buf);
    const frames = decompressFrames(gif, true);

    // we need to use two contexts to correctly support gif disposal types.
    // with disposal type 1, the frame is drawn over the previous frame.
    // it's easier to do stacking here than do it in the specific functions

    const tempCanvas = createCanvas(frames[0].dims.width, frames[0].dims.height);
    const canvas = createCanvas(frames[0].dims.width, frames[0].dims.height);
    const tempCtx = tempCanvas.getContext("2d");
    const ctx = canvas.getContext("2d");

    let imageData: ImageData;
    let needsDisposal = false;

    return (index: number) => {
        const frame = frames[index % frames.length];
        const { width, height } = frame.dims;

        if (!imageData || imageData.width !== width || imageData.height !== height) {
            canvas.width = width;
            canvas.height = height;
            imageData = tempCtx.createImageData(width, height);
        }

        if (needsDisposal) {
            ctx.clearRect(0, 0, width, height);
            needsDisposal = false;
        }

        imageData.data.set(frame.patch);
        tempCtx.putImageData(imageData, 0, 0);

        if (frame.disposalType === 2) {
            needsDisposal = true;
        }

        ctx.drawImage(tempCanvas, 0, 0, width, height);

        return canvas;
    };
}

defineCommand({
    name: "gif",
    description: "Insert a user's avatar into a gif template",
    usage: `<template (one of: ${templates.join(" | ")})> [-reverse] <@user>`,

    async execute({ reply, msg }, templateName, reverseFlagOrUserResolvable, userResolvable = msg.author.id) {
        let reverse = ["-reverse", "--reverse", "-r"].includes(reverseFlagOrUserResolvable);
        if (!reverse && reverseFlagOrUserResolvable) {
            reverse = ["-reverse", "--reverse", "-r"].includes(userResolvable);
            userResolvable = reverseFlagOrUserResolvable;
        }

        if (!templates.includes(templateName)) {
            return reply(`Available templates: ${templates.join(", ")}`);
        }

        const user = await resolveUser(userResolvable);
        if (!user) return reply("Unknown user");

        const memberOrUser = msg.guild
            ? await msg.guild.getMember(user.id).catch(() => user)
            : user;

        const getAvatarFrame = await makeAvatarProvider(memberOrUser);

        if (templateName === "jumpscare") {
            return reply({
                files: [{
                    name: `${user.username} jumpscare.gif`,
                    contents: generateJumpscare(getAvatarFrame, reverse) as Buffer
                }]
            });
        }

        const { config: { width, height, avatarLocation, delay, filename }, frames } = await loadTemplate(templateName);

        const gif = GIFEncoder();
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        function processFrame(img: Image, avatarIdx: number) {
            ctx.drawImage(img, 0, 0, width, height);
            ctx.drawImage(getAvatarFrame(avatarIdx), avatarLocation.x, avatarLocation.y, avatarLocation.width, avatarLocation.height);

            const { data } = ctx.getImageData(0, 0, width, height);

            const palette = quantize(data, 256);

            const index = applyPalette(data, palette);
            gif.writeFrame(index, width, height, { palette, delay });
        }

        if (reverse) {
            for (let i = frames.length - 1; i >= 0; i--) {
                processFrame(frames[i], frames.length - i - 1);
            }
        } else {
            for (let i = 0; i < frames.length; i++) {
                processFrame(frames[i], i);
            }
        }

        gif.finish();

        return reply({ files: [{ name: format(filename, user.username) + ".gif", contents: gif.bytesView() as Buffer }] });
    }
});

function generateJumpscare(getAvatarFrame: AvatarFrameProvider, reverse: boolean) {
    const FINAL_SIZE = 400;
    const START_SIZE = 10;
    const GROWTH_FACTOR = 1.015;

    const gif = GIFEncoder();
    const canvas = createCanvas(FINAL_SIZE, FINAL_SIZE);
    const ctx = canvas.getContext("2d");

    const format = "rgb565";

    function processFrame(size: number, i: number) {
        const offset = (FINAL_SIZE - size) / 2;

        ctx.drawImage(getAvatarFrame(i), offset, offset, size, size);
        const { data } = ctx.getImageData(0, 0, FINAL_SIZE, FINAL_SIZE);

        ctx.clearRect(0, 0, FINAL_SIZE, FINAL_SIZE);

        const palette = quantize(data, 256, { format });

        const index = applyPalette(data, palette, format);
        gif.writeFrame(index, FINAL_SIZE, FINAL_SIZE, { palette, delay: 30, transparent: true });
    }

    if (reverse) {
        for (let i = 0, size = FINAL_SIZE; size >= START_SIZE; i++, size **= 1 / GROWTH_FACTOR) {
            processFrame(size, i);
        }
    } else {
        for (let i = 0, size = START_SIZE; size <= FINAL_SIZE; i++, size **= GROWTH_FACTOR) {
            processFrame(size, i);
        }
    }

    gif.finish();

    return gif.bytesView();
}
