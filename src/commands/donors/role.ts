import { ApplicationCommandOptionTypes, ApplicationCommandTypes, InteractionTypes, MessageFlags } from "oceanic.js";

import { Vaius } from "../../Client";
import { PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const Name = PROD ? "role-add" : "devrole-add";
const description = "fuck you discord";

Vaius.on("interactionCreate", async i => {
    if (!i.inCachedGuildChannel()) return;
    if (i.type !== InteractionTypes.APPLICATION_COMMAND) return;
    if (i.data.name !== Name) return;

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
        position: i.guild.roles.get("1042507929485586532")!.position + 1
    }]);

    await i.guild.addMemberRole(user.id, role.id, "Donor Role");

    await i.createFollowup({
        content: "Done!",
        flags: MessageFlags.EPHEMERAL
    });
});

Vaius.once("ready", () => {
    Vaius.application.createGuildCommand("1015060230222131221", {
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
