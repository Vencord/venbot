import { createCanvas, Image, loadImage, registerFont } from "canvas";
import { AnyGuildChannelWithoutThreads, AnyTextableGuildChannel, MessageReference } from "oceanic.js";

import { Vaius } from "../Client";
import { defineCommand } from "../Command";

const SUPPORT_CHANNEL_ID = "1026515880080842772";
const WIDTH = 400;
const HEIGHT = 260;
const FONT = '"gg sans", "Twemoji Mozilla", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

let img: Image;

interface Channels {
    destCaption: string;
    destCategory: string;
    destChannel: string;
    currentCaption: string;
    currentCategory: string;
    currentChannel: string;
}

defineCommand({
    name: "notsupport",
    aliases: ["ns", "nots"],
    async execute(msg, channelId, ...captionElements) {
        if (!msg.inCachedGuildChannel()) return;

        let channel = msg.client.getChannel(SUPPORT_CHANNEL_ID) as AnyGuildChannelWithoutThreads;
        let caption = captionElements.join(" ");
        if (channelId) {
            const customChannel = msg.guild.channels.get(channelId.match(/\d+/)?.[0] || "");
            if (customChannel) {
                channel = customChannel;
            } else {
                caption = channelId + " " + caption;
            }
        }

        if (!channel || !channel.name) return;

        const [destCaption, currentCaption] = caption.split("|").map(s => s.trim());
        await sendNotSupport(msg.channel, channel, msg.messageReference, destCaption, currentCaption);
    }
});

const NOT_SUPPORT_EMOJI_ID = "1132288507172364360";
Vaius.on("messageReactionAdd", async (msg, user, reaction) => {
    if (reaction.id === NOT_SUPPORT_EMOJI_ID && msg.guild && msg.channel) {
        const currChannel = Vaius.getChannel(msg.channel.id) as AnyTextableGuildChannel;
        if (!currChannel?.guildID) return;

        await sendNotSupport(currChannel, Vaius.getChannel(SUPPORT_CHANNEL_ID) as AnyGuildChannelWithoutThreads, {
            channelID: msg.channel.id,
            guildID: msg.guild.id,
            messageID: msg.id,
            failIfNotExists: true
        });
    }
});

async function sendNotSupport(
    currentChannel: AnyTextableGuildChannel,
    destChannel: AnyGuildChannelWithoutThreads,
    messageReference?: MessageReference,
    destCaption?: string,
    currentCaption?: string,
) {
    const image = await drawNotSupportImage({
        currentCategory: currentChannel.parent?.name || "No Category",
        currentChannel: currentChannel.name,
        destCategory: destChannel.parent?.name || "No Category",
        destChannel: destChannel.name,
        destCaption: destCaption || "you want to be here",
        currentCaption: currentCaption || "you are here"
    });

    currentChannel.createMessage({
        content: `👉 ${destChannel.mention}`,
        files: [
            {
                name: "notsupport.png",
                contents: image
            }
        ],
        messageReference: messageReference
    });
}

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

    function drawText(color: string, text: string, x: number, y: number) {
        ctx.save();

        ctx.font = "600 25px " + FONT;
        ctx.fillStyle = color;
        ctx.fillText(fitString(text, WIDTH - x), x, y);

        ctx.restore();
    }

    drawCategory(channels.destCategory, 83);
    drawChannel(channels.destChannel, 112);
    drawCategory(channels.currentCategory, 215);
    drawChannel(channels.currentChannel, 244);

    drawText("lime", channels.destCaption.slice(0, 100), 120, 20);
    drawText("red", channels.currentCaption.slice(0, 100), 220, 180);

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
