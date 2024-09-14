import { createHash } from "crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { ApplicationCommandOptions, ApplicationCommandOptionTypes, ApplicationCommandTypes, ApplicationIntegrationTypes, CreateChatInputApplicationCommandOptions, InteractionContextTypes, InteractionTypes, MessageFlags } from "oceanic.js";

import { GUILD_ID, MOD_ROLE_ID } from "~/env";
import { handleInteraction } from "~/SlashCommands";

import { OwnerId, Vaius } from "../../Client";
import { DONOR_ROLE_ID, PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const BasePath = "/var/www/badges.vencord.dev";
const BadgeJson = `${BasePath}/badges.json`;
const badgesForUser = (userId: string) => `${BasePath}/badges/${userId}`;

const BadgeData: Record<string, Array<Record<"tooltip" | "badge", string>>> = (() => {
    try {
        return JSON.parse(readFileSync(BadgeJson, "utf-8"));
    } catch {
        return {};
    }
})();

const saveBadges = () => writeFileSync(BadgeJson, JSON.stringify(BadgeData));

const Name = PROD ? "badge" : "devbadge";
const NameAdd = Name + "-add";
const NameEdit = Name + "-edit";
const NameRemove = Name + "-remove";
const NameMove = Name + "-move";

const description = "kiss you discord";

handleInteraction({
    type: InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE,
    isMatch: i => i.data.name.startsWith(`${Name}-`),
    handle(i) {
        const user = i.data.options.getUserOption("user")!;
        const existingBadges = BadgeData[user.value];

        return i.result(existingBadges?.map((b, i) => ({ name: b.tooltip, value: String(i) })) ?? []);
    }
});

handleInteraction({
    type: InteractionTypes.APPLICATION_COMMAND,
    isMatch: i => i.data.name.startsWith(`${Name}-`),
    async handle(i) {
        if (i.user.id !== OwnerId) {
            if (i.guildID !== GUILD_ID || !i.member?.roles.includes(MOD_ROLE_ID))
                return;
        }

        const { data } = i;
        const guild = i.guild ?? i.client.guilds.get(GUILD_ID);

        if (data.name === NameMove) {
            const oldUser = data.options.getUser("old-user", true);
            const newUser = data.options.getUser("new-user", true);

            if (!BadgeData[oldUser.id]?.length)
                return i.createMessage({
                    content: "Badge not found",
                    flags: MessageFlags.EPHEMERAL
                });

            renameSync(badgesForUser(oldUser.id), badgesForUser(newUser.id));

            BadgeData[newUser.id] = BadgeData[oldUser.id];
            BadgeData[newUser.id].forEach(b => b.badge = b.badge.replace(oldUser.id, newUser.id));
            delete BadgeData[oldUser.id];
            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        const user = data.options.getUser("user", true);
        const oldBadgeIndex = data.options.getInteger("old-badge");

        if (data.name === NameRemove) {
            const existingBadge = BadgeData[user.id][oldBadgeIndex!];
            if (!existingBadge) return i.createMessage({
                content: "Badge not found",
                flags: MessageFlags.EPHEMERAL
            });

            const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
            rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });

            BadgeData[user.id].splice(oldBadgeIndex!, 1);
            if (BadgeData[user.id].length === 0)
                delete BadgeData[user.id];

            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        let tooltip = data.options.getString("tooltip");
        const image = data.options.getAttachment("image");
        const imageUrl = data.options.getString("image-url");

        let url = image?.url ?? imageUrl;

        if (!url || !tooltip) {
            const existing = oldBadgeIndex != null && BadgeData[user.id]?.[oldBadgeIndex];
            if (!existing || (!url && !tooltip))
                return i.createMessage({
                    content: "bruh",
                    flags: MessageFlags.EPHEMERAL
                });

            url ??= existing.badge;
            tooltip ??= existing.tooltip;
        }

        i.defer(MessageFlags.EPHEMERAL);

        const imgData = await fetchBuffer(url);

        const ext = new URL(url).pathname.split(".").pop()!;
        const hash = createHash("sha1").update(imgData).digest("hex");

        BadgeData[user.id] ??= [];
        const index = oldBadgeIndex ?? BadgeData[user.id].length;

        const existingBadge = BadgeData[user.id][index];
        if (existingBadge) {
            const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
            rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });
        }

        const fileName = `${index + 1}-${hash}.${ext}`;
        mkdirSync(badgesForUser(user.id), { recursive: true });
        writeFileSync(`${badgesForUser(user.id)}/${fileName}`, imgData);

        BadgeData[user.id][index] = {
            tooltip: tooltip,
            badge: `https://badges.vencord.dev/badges/${user.id}/${fileName}`
        };

        saveBadges();

        if (guild) {
            const member = await guild.getMember(user.id).catch(() => null);
            if (member && !member.roles.includes(DONOR_ROLE_ID))
                await member.addRole(DONOR_ROLE_ID); {
            }
        }

        i.createFollowup({
            content: "Done!",
            flags: MessageFlags.EPHEMERAL
        });
    }
});

function registerCommand(data: CreateChatInputApplicationCommandOptions) {
    Vaius.application.createGuildCommand(GUILD_ID, {
        ...data,
        defaultMemberPermissions: "0",
    });

    Vaius.application.createGlobalCommand({
        ...data,
        contexts: [InteractionContextTypes.BOT_DM, InteractionContextTypes.GUILD, InteractionContextTypes.PRIVATE_CHANNEL],
        integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL]
    });
}

Vaius.once("ready", () => {
    const RequiredUser: ApplicationCommandOptions = {
        name: "user",
        type: ApplicationCommandOptionTypes.USER,
        description,
        required: true
    };
    const Tooltip = (required: boolean) => ({
        name: "tooltip",
        type: ApplicationCommandOptionTypes.STRING,
        description,
        required
    } as ApplicationCommandOptions);
    const Image: ApplicationCommandOptions = {
        name: "image",
        type: ApplicationCommandOptionTypes.ATTACHMENT,
        description
    };
    const ImageUrl: ApplicationCommandOptions = {
        name: "image-url",
        type: ApplicationCommandOptionTypes.STRING,
        description
    };

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameAdd,
        description,
        options: [
            RequiredUser,
            Tooltip(true),
            ImageUrl,
            Image,
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameEdit,
        description,
        options: [
            RequiredUser,
            {
                name: "old-badge",
                description,
                type: ApplicationCommandOptionTypes.INTEGER,
                autocomplete: true,
                required: true
            },
            Tooltip(false),
            ImageUrl,
            Image,
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameRemove,
        description,
        options: [
            RequiredUser,
            {
                name: "old-badge",
                description,
                type: ApplicationCommandOptionTypes.INTEGER,
                autocomplete: true,
                required: true
            }
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameMove,
        description,
        options: [
            {
                name: "old-user",
                type: ApplicationCommandOptionTypes.USER,
                description,
                required: true
            },
            {
                name: "new-user",
                type: ApplicationCommandOptionTypes.USER,
                description,
                required: true
            },
        ]
    });
});
