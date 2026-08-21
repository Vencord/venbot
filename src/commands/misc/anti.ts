import { createCanvas } from "@napi-rs/canvas";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { defineCommand } from "~/Commands";
import { resolveUser } from "~/util/resolvers";
import { makeGifProvider } from "./gif";

defineCommand({
    name: "anti",
    description: "Overlay ❌ over someone's avatar",
    usage: "<@user> [strokeWidth = 30]",
    async execute({ reply }, mention?: string, strokeWidthS?: string) {
        const user = await resolveUser(mention);
        if (!user) return reply("Unknown user");

        const strokeWidth = Number(strokeWidthS ?? "30");
        if (isNaN(strokeWidth) || strokeWidth < 0 || strokeWidth > 100) {
            return reply("Invalid stroke width (must be a number between 0 and 100)");
        }

        const isGif = user.avatar?.startsWith("a_") ?? false;
        const buf = await fetch(user.avatarURL(isGif ? "gif" : "png", 256)).then(res => res.arrayBuffer());
        const avatarProvider = await makeGifProvider(buf, isGif);

        const width = 256, height = 256;

        const gif = GIFEncoder();
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        let palette: number[][] | null = null;

        function processFrame(avatarIdx: number) {
            const { frame, delay } = avatarProvider.getFrame(avatarIdx);

            ctx.drawImage(frame, 0, 0, width, height);
            ctx.strokeStyle = "red";
            ctx.lineWidth = strokeWidth;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width, height);
            ctx.moveTo(width, 0);
            ctx.lineTo(0, height);
            ctx.stroke();

            const { data } = ctx.getImageData(0, 0, width, height);

            palette ??= quantize(data, 256);

            const index = applyPalette(data, palette);
            gif.writeFrame(index, width, height, { palette, delay });
        }

        for (let i = 0; i < avatarProvider.frames; i++) {
            processFrame(i);
        }

        gif.finish();

        return reply({ files: [{ name: `anti-${user.username}.gif`, contents: gif.bytesView() as Buffer }] });
    },
});
