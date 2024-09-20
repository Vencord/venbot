import { defineCommand } from "~/Commands";
import { drawBlobCatCozy } from "~/modules/regularCotd";
import { reply } from "~/util";
import { randomHexColor, toHexColorString } from "~/util/colors";


defineCommand({
    name: "blobcatcozy",
    aliases: ["bcc", "blobcat", "blob", "cat", "cozy"],
    description: "you wouldn't generate a cozy blobcat",
    usage: "[color]",
    async execute(msg, color) {
        if (!color)
            color = randomHexColor();
        else {
            const parsed = Number(color.replace(/^#/, "0x"));
            if (parsed)
                color = toHexColorString(parsed);
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
