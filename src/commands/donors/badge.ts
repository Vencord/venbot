import { createHash } from "crypto";
import { cpSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { ApplicationCommandOptions, ApplicationCommandOptionTypes, ApplicationCommandTypes, ApplicationIntegrationTypes, CreateChatInputApplicationCommandOptions, InteractionContextTypes, InteractionTypes, MessageFlags } from "oceanic.js";

import { ZWSP } from "~/constants";
import { handleInteraction } from "~/SlashCommands";
import { run } from "~/util/functions";

import { buffer } from "stream/consumers";
import Config from "~/config";
import { spawnP } from "~/util/childProcess";
import { getHomeGuild } from "~/util/discord";
import { OwnerId, Vaius } from "../../Client";
import { PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const BasePath = "/var/www/badges.vencord.dev";
const BadgeJson = `${BasePath}/badges.json`;
const badgesForUser = (userId: string) => `${BasePath}/badges/${userId}`;

const BadgeData: Record<string, Array<Record<"tooltip" | "badge", string>>> = run(() => {
    try {
        return JSON.parse(readFileSync(BadgeJson, "utf-8"));
    } catch {
        return {};
    }
});

const saveBadges = () => writeFileSync(BadgeJson, JSON.stringify(BadgeData));

const Name = PROD ? "badge" : "devbadge";
const NameAdd = Name + "-add";
const NameEdit = Name + "-edit";
const NameRemove = Name + "-remove";
const NameRemoveAll = Name + "-remove-all";
const NameMove = Name + "-move";
const NameCopy = Name + "-copy";

const description = "kiss you discord";

async function optimizeImage(imgData: Buffer, ext: string) {
    const { child } = ext === "gif"
        ? spawnP("gifsicle", ["-O3", "--colors", "256", "--resize", "64x64"], {})
        : spawnP("convert", ["-", "-resize", "64x64", "-quality", "75", "WEBP:-"], {});

    child.stdin!.end(imgData);

    return [
        await buffer(child.stdout!),
        ext === "gif" ? "gif" : "webp"
    ] as const;
}

handleInteraction({
    type: InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE,
    isMatch: i => i.data.name.startsWith(`${Name}-`),
    handle(i) {
        const user = i.data.options.getUserOption("user")!;
        const oldBadgeInput = i.data.options.getOptions().find(opt => opt.name === "badge" || opt.name === "before")!.value as string;
        const existingBadges = BadgeData[user.value];

        return i.result(
            existingBadges
                ?.map((b, i) => ({
                    name: `${i} - ${b.tooltip === ZWSP ? "<ZWSP>" : b.tooltip}`,
                    value: String(i)
                }))
                .filter(b => b.name.toLowerCase().includes(oldBadgeInput.toLowerCase()))
            ?? []
        );
    }
});

function normaliseCdnUrl(rawUrl: string) {
    const url = new URL(rawUrl);
    if (url.host !== "cdn.discordapp.com" || url.pathname.includes("/attachments/")) return rawUrl;

    url.searchParams.set("size", "128");

    const isAnimated = url.searchParams.get("animated") === "true";
    if (url.pathname.endsWith(".webp")) {
        const newExt = isAnimated ? "gif" : "png";
        url.pathname = url.pathname.slice(0, -4) + newExt;
    }

    return url.toString();
}

handleInteraction({
    type: InteractionTypes.APPLICATION_COMMAND,
    isMatch: i => i.data.name.startsWith(`${Name}-`),
    async handle(i) {
        if (i.user.id !== OwnerId) return;

        // if (i.user.id !== OwnerId) {
        //     if (i.guildID !== GUILD_ID || !i.member?.roles.includes(MOD_ROLE_ID))
        //         return;
        // }

        const { data } = i;
        const guild = i.guild ?? getHomeGuild();

        if (data.name === NameCopy) {
            const oldUser = data.options.getUser("old-user", true);
            const newUser = data.options.getUser("new-user", true);

            if (!BadgeData[oldUser.id]?.length)
                return i.createMessage({
                    content: "Badge not found",
                    flags: MessageFlags.EPHEMERAL
                });

            cpSync(badgesForUser(oldUser.id), badgesForUser(newUser.id), { recursive: true });

            BadgeData[newUser.id] = BadgeData[oldUser.id].map(b => ({
                ...b,
                badge: b.badge.replace(oldUser.id, newUser.id)
            }));
            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

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
        const existingBadgeIndex = data.options.getInteger("badge");

        if (data.name === NameRemoveAll) {
            if (!BadgeData[user.id]?.length)
                return i.createMessage({
                    content: "No badges found",
                    flags: MessageFlags.EPHEMERAL
                });

            rmSync(badgesForUser(user.id), { recursive: true, force: true });

            delete BadgeData[user.id];

            saveBadges();

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        if (data.name === NameRemove) {
            const existingBadge = BadgeData[user.id][existingBadgeIndex!];
            if (!existingBadge) return i.createMessage({
                content: "Badge not found",
                flags: MessageFlags.EPHEMERAL
            });

            const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
            rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });

            BadgeData[user.id].splice(existingBadgeIndex!, 1);
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
        const optimize = data.options.getBoolean("optimize") ?? false;

        let url = image?.url ?? imageUrl;
        url &&= normaliseCdnUrl(url);

        if (!url || !tooltip) {
            const existing = existingBadgeIndex != null && BadgeData[user.id]?.[existingBadgeIndex];
            if (!existing || (!url && !tooltip))
                return i.createMessage({
                    content: "bruh",
                    flags: MessageFlags.EPHEMERAL
                });

            url ??= existing.badge;
            tooltip ??= existing.tooltip;
        }

        i.defer(MessageFlags.EPHEMERAL);

        let imgData: Buffer = await fetchBuffer(url);
        let ext = new URL(url).pathname.split(".").pop()!;

        if (optimize) {
            ([imgData, ext] = await optimizeImage(imgData, ext));
        }

        const hash = createHash("sha1").update(imgData).digest("hex");

        BadgeData[user.id] ??= [];
        const index = existingBadgeIndex ?? BadgeData[user.id].length;
        const fileName = `${index + 1}-${hash}.${ext}`;

        const newBadgeData = {
            tooltip: tooltip,
            badge: `https://badges.vencord.dev/badges/${user.id}/${fileName}`
        };

        const before = data.options.getInteger("before");
        if (before != null) {
            BadgeData[user.id].splice(before, 0, newBadgeData);
        } else {
            const existingBadge = BadgeData[user.id][index];
            if (existingBadge) {
                const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
                rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });
            }

            BadgeData[user.id][index] = newBadgeData;
        }

        mkdirSync(badgesForUser(user.id), { recursive: true });
        writeFileSync(`${badgesForUser(user.id)}/${fileName}`, imgData);

        saveBadges();

        if (guild) {
            const member = await guild.getMember(user.id).catch(() => null);
            if (member && !member.roles.includes(Config.roles.donor))
                await member.addRole(Config.roles.donor); {
            }
        }

        i.createFollowup({
            content: "Done!",
            flags: MessageFlags.EPHEMERAL
        });
    }
});

function registerCommand(data: CreateChatInputApplicationCommandOptions) {
    Vaius.application.createGuildCommand(Config.homeGuildId, {
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
    const ExistingBadge = (name: string, required = true) => ({
        name,
        description,
        type: ApplicationCommandOptionTypes.INTEGER,
        autocomplete: true,
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
    const OldUser: ApplicationCommandOptions = {
        name: "old-user",
        type: ApplicationCommandOptionTypes.USER,
        description,
        required: true
    };
    const NewUser: ApplicationCommandOptions = {
        name: "new-user",
        type: ApplicationCommandOptionTypes.USER,
        description,
        required: true
    };
    const Optimize: ApplicationCommandOptions = {
        name: "optimize",
        type: ApplicationCommandOptionTypes.BOOLEAN,
        description: "optimize images",
        required: false
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
            ExistingBadge("before", false),
            Optimize
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameEdit,
        description,
        options: [
            RequiredUser,
            ExistingBadge("badge"),
            Tooltip(false),
            ImageUrl,
            Image,
            Optimize
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameRemove,
        description,
        options: [
            RequiredUser,
            ExistingBadge("badge")
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameRemoveAll,
        description,
        options: [RequiredUser]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameMove,
        description,
        options: [
            OldUser,
            NewUser
        ]
    });

    registerCommand({
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameCopy,
        description,
        options: [
            OldUser,
            NewUser
        ]
    });
});
