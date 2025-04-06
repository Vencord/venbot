import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "fs/promises";
import { join } from "path";

import { Vaius } from "~/Client";
import { ASSET_DIR, REGULAR_ROLE_ID } from "~/constants";
import { GUILD_ID } from "~/env";
import { randomHexColor } from "~/util/colors";
import { daily } from "~/util/daily";
import { fetchJson } from "~/util/fetch";

interface ColorResponse {
    name: {
        value: string;
        closest_named_hex: string;
    }
}

export async function drawBlobCatCozy(color: string, size = 512) {
    color = String(color)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");

    const base = join(ASSET_DIR, "image-gen/regular-icon");
    const svgPath = join(base, "bcc.svg");

    const svgData = await readFile(svgPath, "utf-8");
    const tintedSvg = svgData.replaceAll("#1a2b3c", color);
    const svg = await loadImage(Buffer.from(tintedSvg));

    svg.width = size;
    svg.height = size;

    const canvas = createCanvas(size, size);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(svg, 0, 0, size, size);

    return canvas.toBuffer("image/png");
}

export async function rerollCotd(inputHex?: string) {
    const hexColor = inputHex ?? randomHexColor();
    const {
        name: {
            value: name,
            closest_named_hex: hex
        }
    } = await fetchJson<ColorResponse>("https://www.thecolorapi.com/id?hex=" + hexColor.slice(1));

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
