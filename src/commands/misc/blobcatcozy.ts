import { defineCommand } from "~/Commands";
import { drawBlobCatCozy } from "~/modules/regularCotd";
import { reply } from "~/util";


defineCommand({
    name: "blobcatcozy",
    aliases: ["bcc", "blobcat", "blob", "cat", "cozy"],
    description: "you wouldn't generate a cozy blobcat",
    usage: "[color]",
    async execute(msg, color) {
        if (!color)
            color = "#" + Math.floor(Math.random() * 0xffffff).toString(16);
        else {
            const parsed = Number(color.replace(/^#/, "0x"));
            if (parsed)
                color = "#" + parsed.toString(16);
        }

        const cozy = await drawBlobCatCozy(color);

        return reply(msg, {
            files: [{
                name: "blobcatcozy.png",
                contents: cozy
            }]
        });
    }
});
