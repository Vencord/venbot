import { createCanvas, Image, loadImage, registerFont } from "canvas";

const WIDTH = 400;
const HEIGHT = 260;
const FONT = '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

let img: Image;

interface Channels {
    destCategory: string;
    destChannel: string;
    currentCategory: string;
    currentChannel: string;
}

function draw(channels: Channels) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#949ba4";

    function fitString(str: string, maxWidth: number) {
        let { width } = ctx.measureText(str);
        const ellipsis = "…";
        const ellipsisWidth = ctx.measureText(ellipsis).width;
        if (width <= maxWidth || width <= ellipsisWidth) {
            return str;
        } else {
            let len = str.length;
            while (width >= maxWidth - ellipsisWidth && len-- > 0) {
                str = str.substring(0, len);
                ({ width } = ctx.measureText(str));
            }
            return str + ellipsis;
        }
    }

    function drawCategory(name: string, x: number, y: number) {
        ctx.save();

        ctx.font = "600 12px " + FONT;
        // ctx.letterSpacing = "0.24px";
        ctx.fillText(fitString(name.toUpperCase(), 218), x, y);

        ctx.restore();
    }

    function drawChannel(name: string, x: number, y: number) {
        ctx.save();

        ctx.font = "500 16px " + FONT;
        ctx.fillText(fitString(name, 165), x, y);

        ctx.restore();
    }

    drawCategory(channels.destCategory, 18, 83);
    drawChannel(channels.destChannel, 40, 112);
    drawCategory(channels.currentCategory, 18, 215);
    drawChannel(channels.currentChannel, 40, 244);

    return canvas.toBuffer();
}


export async function drawNotSupportImage(channels: Channels) {
    if (!img) {
        img = await loadImage("./data/assets/not-support-template.png");

        for (const weight of ["500", "600"]) {
            registerFont(`./data/assets/gg-sans-${weight}.ttf`, {
                family: "gg sans",
                weight
            });
        }
    }

    return draw(channels);
}
