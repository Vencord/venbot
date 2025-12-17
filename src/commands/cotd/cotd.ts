import { defineCommand } from "~/Commands";
import Config from "~/config";
import { drawBlobCatCozy } from "~/modules/regularCotd";
import { toHexColorString } from "~/util/text";

defineCommand({
    name: "cotd",
    description: "Shows the current cozy of the day",
    usage: null,
    guildOnly: true,
    async execute({ msg, reply }, hex: string) {
        const regularRole = msg.guild!.roles.get(Config.roles.regular)!;

        const [, colorName] = regularRole.name.match(/\((.+)\)/i)!;

        return reply({
            embeds: [{
                description: `The cozy of the day is ${colorName}! (${toHexColorString(regularRole.colors.primaryColor)})`,
                color: regularRole.colors.primaryColor,
                image: {
                    url: "attachment://blobcatcozy.png"
                }
            }],
            files: [{
                name: "blobcatcozy.png",
                contents: await drawBlobCatCozy(toHexColorString(regularRole.colors.primaryColor)) // role icons are non-perma links
            }]
        });
    }
});
