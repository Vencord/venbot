import { defineCommand } from "../Command";
import { drawNotSupportImage } from "../notSupportPainter";

defineCommand({
    name: "notsupport",
    aliases: ["ns", "nots"],
    async execute(msg) {
        if (!msg.inCachedGuildChannel()) return;

        const image = await drawNotSupportImage({
            currentCategory: msg.channel.parent?.name || "No Category",
            currentChannel: msg.channel.name,
            destCategory: "support",
            destChannel: "🏥-support-🏥"
        });

        msg.channel.createMessage({
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
