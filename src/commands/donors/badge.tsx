import { createHash } from "crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { MessageFlags } from "oceanic.js";

import { ZWSP } from "~/constants";
import { ChatInputCommandOptions, CommandInteractionHandler, registerChatInputCommand } from "~/SlashCommands";
import { run } from "~/util/functions";

import { buffer } from "stream/consumers";
import Config from "~/config";
import { atomicWriteFileSync } from "~/util/atomicWriteFile";
import { spawnP } from "~/util/childProcess";
import { getHomeGuild } from "~/util/discord";
import { logBotAuditAction } from "~/util/logAction";
import { CommandAttachmentOption, CommandBooleanOption, CommandIntegerOption, CommandStringOption, CommandUserOption } from "~components";
import { OwnerId } from "../../Client";
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

const saveBadges = () => atomicWriteFileSync(BadgeJson, JSON.stringify(BadgeData));

const Name = PROD ? "badge" : "devbadge";
const NameAdd = Name + "-add";
const NameEdit = Name + "-edit";
const NameRemove = Name + "-remove";
const NameRemoveAll = Name + "-remove-all";
const NameMove = Name + "-move";
const NameCopy = Name + "-copy";

async function optimizeImage(imgData: Buffer, ext: string) {
    const { child } = ext === "gif"
        ? spawnP("gifsicle", ["-O3", "--colors", "256", "--resize", "64x64"], {})
        : spawnP("convert", ["-", "-resize", "64x64", "-quality", "75", "WEBP:-"], {});

    child.stdin!.end(imgData);

    const res = await buffer(child.stdout!);

    return [
        res.byteLength < imgData.byteLength ? res : imgData,
        ext === "gif" ? "gif" : "webp",
        imgData.byteLength,
        res.byteLength
    ] as const;
}

function normaliseCdnUrl(rawUrl: string) {
    const url = new URL(rawUrl);
    if (url.host !== "cdn.discordapp.com" || url.pathname.includes("/attachments/")) return rawUrl;

    url.searchParams.set("size", "128");

    return url.toString();
}

const handler: CommandInteractionHandler = {
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

            logBotAuditAction(`Badges copied from ${oldUser.username} (${oldUser.mention}) to ${newUser.username} (${newUser.mention})`);
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

            const oldFolder = badgesForUser(oldUser.id);
            const newFolder = badgesForUser(newUser.id);

            if (BadgeData[newUser.id]) {
                const files = readdirSync(oldFolder);
                for (const file of files) {
                    const oldPath = `${oldFolder}/${file}`;
                    const newPath = `${newFolder}/${file}`;

                    renameSync(oldPath, newPath);
                }

                rmSync(oldFolder, { recursive: true, force: true });
            } else {
                renameSync(oldFolder, newFolder);
                BadgeData[newUser.id] = [];
            }

            const oldBadgeData = BadgeData[oldUser.id];
            oldBadgeData.forEach(b => b.badge = b.badge.replace(oldUser.id, newUser.id));
            BadgeData[newUser.id].push(...oldBadgeData);

            delete BadgeData[oldUser.id];
            saveBadges();

            logBotAuditAction(`Badges moved from ${oldUser.username} (${oldUser.mention}) to ${newUser.username} (${newUser.mention})`);

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

            logBotAuditAction(`All badges removed from ${user.username} (${user.mention})`);

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
            const contents = readFileSync(`${badgesForUser(user.id)}/${fileName}`);

            BadgeData[user.id].splice(existingBadgeIndex!, 1);

            if (!BadgeData[user.id].some(b => b.badge === existingBadge.badge)) {
                rmSync(`${badgesForUser(user.id)}/${fileName}`, { force: true });
            }

            if (BadgeData[user.id].length === 0)
                delete BadgeData[user.id];

            saveBadges();

            logBotAuditAction({
                content: `Badge removed from ${user.username} (${user.mention})`,
                files: [{
                    name: fileName,
                    contents
                }]
            });

            return i.createMessage({
                content: "Done!",
                flags: MessageFlags.EPHEMERAL
            });
        }

        // Add or Edit

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
        let footer = "";

        if (optimize) {
            let sizes: [number, number];
            ([imgData, ext, ...sizes] = await optimizeImage(imgData, ext));

            footer = `${(sizes[0] / 1024).toFixed(2)}k -> ${(sizes[1] / 1024).toFixed(2)}k\n`;
        }

        const hash = createHash("sha1").update(imgData).digest("hex");

        BadgeData[user.id] ??= [];
        const index = existingBadgeIndex ?? BadgeData[user.id].length;
        const fileName = `${hash}.${ext}`;

        const newBadgeData = {
            tooltip: tooltip,
            badge: `https://badges.vencord.dev/badges/${user.id}/${fileName}`
        };

        const before = data.options.getInteger("before");
        if (before != null) {
            BadgeData[user.id].splice(before, 0, newBadgeData);
        } else {
            const existingBadge = BadgeData[user.id][index];
            if (existingBadge && BadgeData[user.id].filter(b => b.badge === existingBadge.badge).length === 1) {
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

        logBotAuditAction({
            content: `Badge ${data.name === NameEdit ? "edited" : "added"} for ${user.username} (${user.mention})`,
            files: [{
                name: fileName,
                contents: imgData
            }]
        });

        i.createFollowup({
            content: `Done!${footer && "\n\n-# " + footer}`,
            flags: MessageFlags.EPHEMERAL
        });
    },

    autoComplete(i) {
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
                .slice(0, 25)
            ?? []
        );
    }
};

function registerCommand(data: ChatInputCommandOptions) {
    registerChatInputCommand({
        ...data,
        defaultMemberPermissions: "0",
    }, handler);
}

const RequiredUser = <CommandUserOption name="user" required />;
const NewUser = <CommandUserOption name="new-user" required />;
const OldUser = <CommandUserOption name="old-user" required />;
const Optimize = <CommandBooleanOption name="optimize" />;
const Image = <CommandAttachmentOption name="image" />;
const ImageUrl = <CommandStringOption name="image-url" />;
const makeTooltip = (required: boolean) => <CommandStringOption name="tooltip" required={required} />;
const makeExistingBadge = (name: string, required = true) => <CommandIntegerOption name={name} required={required} autocomplete />;

registerCommand({
    name: NameAdd,
    options: [
        RequiredUser,
        makeTooltip(true),
        ImageUrl,
        Image,
        makeExistingBadge("before", false),
        Optimize
    ]
});

registerCommand({
    name: NameEdit,
    options: [
        RequiredUser,
        makeExistingBadge("badge"),
        makeTooltip(false),
        ImageUrl,
        Image,
        Optimize
    ]
});

registerCommand({
    name: NameRemove,
    options: [RequiredUser, makeExistingBadge("badge")]
});

registerCommand({
    name: NameRemoveAll,
    options: [RequiredUser]
});

registerCommand({
    name: NameMove,
    options: [OldUser, NewUser]
});

registerCommand({
    name: NameCopy,
    options: [OldUser, NewUser]
});
