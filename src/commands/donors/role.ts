import { ApplicationCommandOptionTypes, MessageFlags } from "oceanic.js";

import { registerChatInputCommand } from "~/SlashCommands";

import Config from "~/config";
import { PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const Name = PROD ? "role-add" : "devrole-add";
const description = "fuck you discord";

registerChatInputCommand(
    {
        name: Name,
        description,
        defaultMemberPermissions: "0",
        options: [
            {
                name: "user",
                type: ApplicationCommandOptionTypes.USER,
                description,
                required: true
            },
            {
                name: "name",
                type: ApplicationCommandOptionTypes.STRING,
                description,
                required: true
            },
            {
                name: "color",
                type: ApplicationCommandOptionTypes.STRING,
                description
            },
            {
                name: "icon-url",
                type: ApplicationCommandOptionTypes.STRING,
                description
            },
            {
                name: "icon",
                type: ApplicationCommandOptionTypes.ATTACHMENT,
                description
            }
        ]
    },
    {
        guildOnly: true,
        async handle(i) {
            await i.defer(MessageFlags.EPHEMERAL);

            const opts = i.data.options;
            const user = opts.getUser("user", true);
            const name = opts.getString("name", true);
            const color = opts.getString("color")?.replace(/#/, "") || "000000";
            const iconUrl = opts.getAttachment("icon")?.url || opts.getString("icon-url");

            const iconBuf = !iconUrl
                ? undefined
                : await fetchBuffer(iconUrl);

            const role = await i.guild.createRole({
                name,
                colors: {
                    primaryColor: parseInt(color, 16),
                },
                icon: iconBuf,
                hoist: false,
                mentionable: false,
                reason: `Donor Role for ${user.tag}`,
                permissions: "0"
            });

            await i.guild.editRolePositions([{
                id: role.id,
                position: i.guild.roles.get(Config.roles.donor)!.position + 1
            }]);

            await i.guild.addMemberRole(user.id, role.id, "Custom Donor Role");
            await i.guild.addMemberRole(user.id, Config.roles.donor, "Donor Role");

            await i.createFollowup({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }
    }
);
