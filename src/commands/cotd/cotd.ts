import { defineCommand } from "~/Commands";
import { REGULAR_ROLE_ID } from "~/constants";
import { drawBlobCatCozy } from "~/modules/regularCotd";
import { reply } from "~/util";
import { toHexColorString } from "~/util/colors";

defineCommand({
    name: "cotd",
    description: "Shows the current cozy of the day",
    usage: null,
    guildOnly: true,
    async execute(msg, hex: string) {
        const regularRole = msg.guild!.roles.get(REGULAR_ROLE_ID)!;

        const [, colorName] = regularRole.name.match(/\((.+)\)/i)!;

        return reply(msg, {
            embeds: [{
                description: `The cozy of the day is ${colorName}!`,
                color: regularRole.color,
                image: {
                    url: "attachment://blobcatcozy.png"
                }
            }],
            files: [{
                name: "blobcatcozy.png",
                contents: await drawBlobCatCozy("#" + toHexColorString(regularRole.color)) // role icons are non-perma links
            }]
        });
    }
});
