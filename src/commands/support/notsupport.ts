import { createCanvas, GlobalFonts, Image, loadImage } from "@napi-rs/canvas";
import { AnyGuildChannelWithoutThreads } from "oceanic.js";
import { join } from "path";

import { defineCommand } from "~/Commands";
import { ASSET_DIR } from "~/constants";
import { SUPPORT_CHANNEL_ID } from "~/env";
import { silently } from "~/util/functions";

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

const DefaultCaptionsEnglish = {
    category: "No Category",
    destCaption: "you want to be here",
    originCaption: "you are here"
};

const DefaultCaptionsGerman = {
    category: "Keine Kategorie",
    destCaption: "du solltest hier sein",
    originCaption: "du bist hier"
};

defineCommand({
    name: "notsupport",
    aliases: ["ns", "nots"],
    description: "Create a graphic guiding people to the correct channel (usually support)",
    usage: "[destination channel] [destination caption] | [origin caption]",
    guildOnly: true,
    async execute({ msg, createMessage }, channelId, ...captionElements) {
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

        const DefaultCaptions = msg.channelID === "1121201005456011366" ? DefaultCaptionsGerman : DefaultCaptionsEnglish;

        const image = await drawNotSupportImage({
            currentCategory: msg.channel.parent?.name || DefaultCaptions.category,
            currentChannel: msg.channel.name,
            destCategory: channel.parent?.name || DefaultCaptions.category,
            destChannel: channel.name,
            destCaption: destCaption || DefaultCaptions.destCaption,
            currentCaption: currentCaption || DefaultCaptions.originCaption
        });

        let content = `👉 ${channel.mention}`;

        const isReply = !!msg.referencedMessage;
        if (isReply) {
            content += `\n\n(Auto-response invoked by ${msg.author.mention})`;
            silently(msg.delete());
        }

        return createMessage({
            content,
            files: [
                {
                    name: "notsupport.png",
                    contents: image
                }
            ],
            messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
            allowedMentions: { repliedUser: isReply }
        });
    }
});


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

    return canvas.toBuffer("image/png");
}


async function drawNotSupportImage(channels: Channels) {
    if (!img) {
        const base = join(ASSET_DIR, "image-gen/not-support");
        img = await loadImage(join(base, "not-support-template.png"));

        GlobalFonts.registerFromPath(join(base, "twemoji.ttf"), "Twemoji Mozilla");
        for (const weight of ["500", "600"]) {
            GlobalFonts.registerFromPath(join(base, `gg-sans-${weight}.ttf`));
        }
    }

    return draw(channels);
}
