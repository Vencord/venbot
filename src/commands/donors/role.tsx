import { MessageFlags } from "oceanic.js";

import { registerChatInputCommand } from "~/SlashCommands";

import Config from "~/config";
import { CommandAttachmentOption, CommandStringOption, CommandUserOption } from "~components";
import { PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const Name = PROD ? "role-add" : "devrole-add";
const description = "fuck you discord";

registerChatInputCommand(
    {
        name: Name,
        description,
        defaultMemberPermissions: "0",
        options: <>
            <CommandUserOption name="user" required />
            <CommandStringOption name="name" required />
            <CommandStringOption name="color" />
            <CommandStringOption name="icon-url" />
            <CommandAttachmentOption name="icon" />
        </>
    },
    {
        guildOnly: true,
        ownerOnly: true,
        async handle(i) {
            if (i.guild.id !== Config.homeGuildId) {
                return i.createMessage({
                    content: "This command can only be used in the home server.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

            await i.defer(MessageFlags.EPHEMERAL);

            const opts = i.data.options;
            const user = opts.getUser("user", true);
            const name = opts.getString("name", true);
            const color = opts.getString("color")?.replace(/^#/, "") || "000000";
            const iconUrl = opts.getAttachment("icon")?.url || opts.getString("icon-url");

            if (!/^[0-9a-f]{6}$/i.test(color)) {
                return i.createFollowup({
                    content: "Invalid color. Expected a six-digit hex color.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

            const donorRole = i.guild.roles.get(Config.roles.donor);
            if (!donorRole) {
                return i.createFollowup({
                    content: "The donor role is not configured in this server.",
                    flags: MessageFlags.EPHEMERAL
                });
            }

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
                position: donorRole.position + 1
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
