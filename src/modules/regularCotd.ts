import { createCanvas, Image, loadImage } from "canvas";
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

let baseImage: Image;
let tintImage: Image;

async function drawIcon(color: string) {
    const base = join(ASSET_DIR, "image-gen/regular-icon");

    if (!baseImage) {
        baseImage = await loadImage(join(base, "base-layer.png"));
        tintImage = await loadImage(join(base, "tint-layer.png"));
    }

    const canvas = createCanvas(128, 128);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `#${color}`;
    ctx.fillRect(0, 0, 128, 128);

    ctx.globalCompositeOperation = "destination-atop";
    ctx.drawImage(tintImage, 0, 0, 128, 128);

    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(baseImage, 0, 0, 128, 128);

    return canvas.toDataURL();
}

export async function rerollCotd() {
    const randomHex = ((1 << 24) * Math.random() | 0).toString(16);
    const {
        name: {
            value: name,
            closest_named_hex: hex
        }
    } = await fetchJson<ColorResponse>("https://www.thecolorapi.com/id?hex=" + randomHex);

    const color = parseInt(hex.slice(1), 16);

    await Vaius.guilds.get(GUILD_ID)!.editRole(REGULAR_ROLE_ID, {
        name: "regular " + name.toLowerCase(),
        color,
        icon: await drawIcon(hex)
    });
}

daily(rerollCotd);
