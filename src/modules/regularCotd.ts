import { createCanvas, loadImage } from "canvas";
import { readFile } from "fs/promises";
import { join } from "path";

import { Vaius } from "~/Client";
import { ASSET_DIR, REGULAR_ROLE_ID } from "~/constants";
import { GUILD_ID } from "~/env";
import { daily } from "~/util/daily";
import { fetchJson } from "~/util/fetch";

interface ColorResponse {
    name: {
        value: string;
        closest_named_hex: string;
    }
}

export async function drawBlobCatCozy(color: string, w = 256, h = 256) {
    const base = join(ASSET_DIR, "image-gen/regular-icon");
    const svgPath = join(base, "bcc.svg");

    const svgData = await readFile(svgPath, "utf-8");
    const tintedSvg = svgData.replaceAll("#1a2b3c", JSON.stringify(color));
    const svg = await loadImage(Buffer.from(tintedSvg));

    svg.width = w;
    svg.height = h;

    const canvas = createCanvas(w, h);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(svg, 0, 0, w, h);

    return canvas.toBuffer("image/png");
}

export async function rerollCotd(inputHex?: string) {
    const randomHex = inputHex ?? Math.floor(Math.random() * 0xffffff).toString(16);
    const {
        name: {
            value: name,
            closest_named_hex: hex
        }
    } = await fetchJson<ColorResponse>("https://www.thecolorapi.com/id?hex=" + randomHex);

    const color = parseInt(hex.slice(1), 16);
    const icon = await drawBlobCatCozy(hex);

    await Vaius.guilds.get(GUILD_ID)!.editRole(REGULAR_ROLE_ID, {
        name: `regular (${name.toLowerCase()})`,
        color,
        icon,
        reason: "Rerolled cozy of the day"
    });
}

daily(rerollCotd);
