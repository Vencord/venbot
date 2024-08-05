import { ApplicationCommandOptionTypes, ApplicationCommandTypes, MessageFlags } from "oceanic.js";

import { GUILD_ID } from "~/env";
import { handleCommandInteraction } from "~/SlashCommands";

import { Vaius } from "../../Client";
import { DONOR_ROLE_ID, PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const Name = PROD ? "role-add" : "devrole-add";
const description = "fuck you discord";

handleCommandInteraction({
    name: Name,
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
            color: parseInt(color, 16),
            icon: iconBuf,
            hoist: false,
            mentionable: false,
            reason: `Donor Role for ${user.tag}`,
            permissions: "0"
        });

        await i.guild.editRolePositions([{
            id: role.id,
            position: i.guild.roles.get(DONOR_ROLE_ID)!.position + 1
        }]);

        await i.guild.addMemberRole(user.id, role.id, "Custom Donor Role");
        await i.guild.addMemberRole(user.id, DONOR_ROLE_ID, "Donor Role");

        await i.createFollowup({
            content: "Done!",
            flags: MessageFlags.EPHEMERAL
        });
    }
});

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand(GUILD_ID, {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: Name,
        description,
        defaultMemberPermissions: "0", // admins only,
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
    });
});
