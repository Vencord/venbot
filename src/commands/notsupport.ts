import { createCanvas, Image, loadImage, registerFont } from "canvas";
import { AnyGuildChannelWithoutThreads } from "oceanic.js";

import { defineCommand } from "../Command";

const SUPPORT_CHANNEL_ID = "1026515880080842772";
const WIDTH = 400;
const HEIGHT = 260;
const FONT = '"gg sans", "Twemoji Mozilla", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

let img: Image;

interface Channels {
    destCategory: string;
    destChannel: string;
    currentCategory: string;
    currentChannel: string;
}

defineCommand({
    name: "notsupport",
    aliases: ["ns", "nots"],
    async execute(msg, channelId) {
        if (!msg.inCachedGuildChannel()) return;

        let channel = channelId && msg.guild.channels.get(channelId.match(/\d+/)?.[0] || "");
        channel ||= msg.client.getChannel(SUPPORT_CHANNEL_ID) as AnyGuildChannelWithoutThreads;

        if (!channel || !channel.name) return;

        const image = await drawNotSupportImage({
            currentCategory: msg.channel.parent?.name || "No Category",
            currentChannel: msg.channel.name,
            destCategory: channel.parent?.name || "No Category",
            destChannel: channel.name
        });
        msg.channel.createMessage({
            content: `👉 ${channel.mention}`,
            files: [
                {
                    name: "notsupport.png",
                    contents: image
                }
            ],
            messageReference: msg.messageReference
        });
    }
});


function draw(channels: Channels) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#949ba4";
    ctx.textDrawingMode = "glyph";

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

    function drawCategory(name: string, y: number) {
        ctx.save();

        ctx.font = "600 12px " + FONT;
        // ctx.letterSpacing = "0.24px";
        ctx.fillText(fitString(name.toUpperCase(), 218), 18, y);

        ctx.restore();
    }

    function drawChannel(name: string, y: number) {
        ctx.save();

        ctx.font = "500 16px " + FONT;
        ctx.fillText(fitString(name, 163), 42, y);

        ctx.restore();
    }

    drawCategory(channels.destCategory, 83);
    drawChannel(channels.destChannel, 112);
    drawCategory(channels.currentCategory, 215);
    drawChannel(channels.currentChannel, 244);

    return canvas.toBuffer();
}


async function drawNotSupportImage(channels: Channels) {
    if (!img) {
        img = await loadImage("./data/assets/not-support-template.png");

        registerFont("./data/assets/twemoji.ttf", {
            family: "Twemoji Mozilla"
        });

        for (const weight of ["500", "600"]) {
            registerFont(`./data/assets/gg-sans-${weight}.ttf`, {
                family: "gg sans",
                weight
            });
        }
    }

    return draw(channels);
}
