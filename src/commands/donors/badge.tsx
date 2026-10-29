import { createHash } from "crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { ApplicationCommandOptionTypes, MessageFlags } from "oceanic.js";

import { ZWSP } from "~/constants";
import { ChatInputCommandOptions, CommandInteractionHandler, registerChatInputCommand } from "~/SlashCommands";
import { run } from "~/util/functions";
import { parseBulkBadges } from "./parseBulkBadges";

import sharp from "sharp";
import Config from "~/config";
import { OwnerId } from "~/owner";
import { atomicWriteFileSync } from "~/util/atomicWriteFile";
import { getHomeGuild } from "~/util/discord";
import { lookupKlipyURL, lookupTenorURL } from "~/util/gifs";
import { logBotAuditAction } from "~/util/logAction";
import { CommandAttachmentOption, CommandBooleanOption, CommandIntegerOption, CommandStringOption, CommandUserOption } from "~components";
import { PROD } from "../../constants";
import { fetchBuffer } from "../../util/fetch";

const BasePath = "/var/www/badges.vencord.dev";
const BadgeJson = `${BasePath}/badges.json`;
const badgesForUser = (userId: string) => `${BasePath}/badges/${userId}`;

interface BadgeInfo {
    tooltip?: string;
    badge: string;
    /** Indicates that a 2x resolution variant of the badge image exists */
    "2"?: 1;
}
const BadgeData: Record<string, Array<BadgeInfo>> = run(() => {
    try {
        return JSON.parse(readFileSync(BadgeJson, "utf-8"));
    } catch {
        return {};
    }
});

const saveBadges = () => atomicWriteFileSync(BadgeJson, JSON.stringify(BadgeData));

const COMMAND_NAME = PROD ? "badge" : "devbadge";

async function optimizeImage(imgData: Buffer, ext: string) {
    const img = sharp(imgData, {
        animated: true,
        autoOrient: true
    });

    const { width, height } = await img.metadata();
    const originalSize = Math.min(width, height);
    const size = Math.min(originalSize, 128);
    const size2x = Math.min(originalSize, 256);

    const resizeOptions = {
        fit: "cover",
        position: "centre",
        kernel: "lanczos3",
    } as const;

    const webpOptions = {
        quality: 30,
        alphaQuality: 90,
        effort: 6,
        mixed: true,
        loop: 0
    } as const;

    const [res, res2x] = await Promise.all([
        img.clone()
            .resize(size, size, resizeOptions)
            .webp(webpOptions)
            .toBuffer(),
        // Never upscale, and don't create a 2x variant for images that are already 128px or smaller
        originalSize < 128
            ? undefined
            : img.clone()
                .resize(size2x, size2x, resizeOptions)
                .webp(webpOptions)
                .toBuffer()
    ]);

    return [
        res,
        res2x,
        "webp",
        imgData.byteLength,
        res.byteLength
    ] as const;
}

async function normaliseUrl(rawUrl: string) {
    const url = new URL(rawUrl);
    if (url.host === "tenor.com") return lookupTenorURL(url);
    if (url.host === "klipy.com") return lookupKlipyURL(url);
    if (url.host !== "cdn.discordapp.com" || url.pathname.includes("/attachments/")) return rawUrl;

    url.searchParams.set("size", "128");

    return url.toString();
}

async function fetchAndProcessBadgeImage(rawUrl: string, userId: string, optimize: boolean) {
    const url = await normaliseUrl(rawUrl);

    let imgData: Buffer = await fetchBuffer(url);
    let imgData2x: Buffer | undefined;
    let ext = new URL(url).pathname.split(".").pop()!;

    let before = imgData.byteLength;
    let after = imgData.byteLength;

    if (optimize) {
        ([imgData, imgData2x, ext, before, after] = await optimizeImage(imgData, ext));
    }

    const hash = createHash("sha1").update(imgData).digest("hex");
    const fileName = `${hash}.${ext}`;

    return {
        fileName,
        imgData,
        imgData2x,
        before,
        after,
        badgeUrl: `https://badges.vencord.dev/badges/${userId}/${fileName}`
    };
}

const get2xFileName = (fileName: string) => {
    const extIndex = fileName.lastIndexOf(".");
    return `${fileName.slice(0, extIndex)}@2x${fileName.slice(extIndex)}`;
};

/** Writes a processed badge image to disk. Kept separate so writes can be done in order. */
function writeBadgeImage(userId: string, fileName: string, imgData: Buffer, imgData2x?: Buffer) {
    mkdirSync(badgesForUser(userId), { recursive: true });
    writeFileSync(`${badgesForUser(userId)}/${fileName}`, imgData);
    if (imgData2x) writeFileSync(`${badgesForUser(userId)}/${get2xFileName(fileName)}`, imgData2x);
}

/** Removes a badge image and its 2x variant from disk. */
function removeBadgeImage(userId: string, fileName: string) {
    rmSync(`${badgesForUser(userId)}/${fileName}`, { force: true });
    rmSync(`${badgesForUser(userId)}/${get2xFileName(fileName)}`, { force: true });
}

const handler: CommandInteractionHandler = {
    async handle(i) {
        const [subCommand] = i.data.options.getSubCommand(true);

        if (i.user.id !== OwnerId) return;

        const { data } = i;
        const guild = i.guild ?? getHomeGuild();

        if (subCommand === "copy") {
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

        if (subCommand === "move") {
            const oldUser = data.options.getUser("old-user", true);
            const newUser = data.options.getUser("new-user", true);

            if (oldUser.id === newUser.id)
                return i.createMessage({
                    content: "Cannot move badges to the same user",
                    flags: MessageFlags.EPHEMERAL
                });

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

        if (subCommand === "remove-all") {
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

        if (subCommand === "remove") {
            const existingBadge = BadgeData[user.id]?.[existingBadgeIndex!];
            if (!existingBadge) return i.createMessage({
                content: "Badge not found",
                flags: MessageFlags.EPHEMERAL
            });

            const fileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
            const contents = readFileSync(`${badgesForUser(user.id)}/${fileName}`);

            BadgeData[user.id].splice(existingBadgeIndex!, 1);

            if (!BadgeData[user.id].some(b => b.badge === existingBadge.badge)) {
                removeBadgeImage(user.id, fileName);
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

        if (subCommand === "add-bulk") {
            const text = data.options.getString("text", true);
            const optimize = data.options.getBoolean("optimize") ?? true;

            i.defer(MessageFlags.EPHEMERAL);

            const parsed = await parseBulkBadges(text);

            if (!parsed.length)
                return i.createFollowup({
                    content: "No badges found in text",
                    flags: MessageFlags.EPHEMERAL
                });

            BadgeData[user.id] ??= [];

            const results = await Promise.all(parsed.map(async ([rawUrl, tooltip]) => {
                try {
                    const processed = await fetchAndProcessBadgeImage(rawUrl, user.id, optimize);
                    return { ok: true as const, tooltip, ...processed };
                } catch {
                    return { ok: false as const };
                }
            }));

            let addedCount = 0;
            let totalBefore = 0;
            let totalAfter = 0;
            let failCount = 0;

            for (const result of results) {
                if (!result.ok) {
                    failCount++;
                    continue;
                }

                const { fileName, imgData, imgData2x, before, after, badgeUrl, tooltip } = result;

                writeBadgeImage(user.id, fileName, imgData, imgData2x);

                totalBefore += before;
                totalAfter += after;

                const newBadgeData: BadgeInfo = { tooltip, badge: badgeUrl };
                if (imgData2x) newBadgeData["2"] = 1;
                if (!tooltip || tooltip === ZWSP) delete newBadgeData.tooltip;

                BadgeData[user.id].push(newBadgeData);
                addedCount++;
            }

            if (BadgeData[user.id].length === 0)
                delete BadgeData[user.id];

            saveBadges();

            if (guild && addedCount) {
                const member = await guild.getMember(user.id).catch(() => null);
                if (member && !member.roles.includes(Config.roles.donor))
                    await member.addRole(Config.roles.donor);
            }

            if (addedCount)
                logBotAuditAction(
                    `${addedCount} badge(s) bulk-added for ${user.username} (${user.mention})${failCount ? ` (${failCount} failed)` : ""}`
                );

            const footer = optimize ? `${(totalBefore / 1024).toFixed(2)}k -> ${(totalAfter / 1024).toFixed(2)}k\n` : "";

            return i.createFollowup({
                content: `Done! Added ${addedCount} badge(s).${failCount ? ` ${failCount} failed.` : ""}${footer && "\n\n-# " + footer}`,
                flags: MessageFlags.EPHEMERAL
            });
        }

        // Add or Edit

        let tooltip = data.options.getString("tooltip");
        const image = data.options.getAttachment("image");
        const imageUrl = data.options.getString("image-url");

        let url = image?.url ?? imageUrl;
        if (url) url = await normaliseUrl(url);

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

        const optimize = data.options.getBoolean("optimize") ?? !url.includes(".svg");

        i.defer(MessageFlags.EPHEMERAL);

        const { fileName, imgData, imgData2x, before, after, badgeUrl } = await fetchAndProcessBadgeImage(url, user.id, optimize);

        const footer = optimize
            ? `${(before / 1024).toFixed(2)}k -> ${(after / 1024).toFixed(2)}k\n`
            : "";

        BadgeData[user.id] ??= [];
        const index = existingBadgeIndex ?? BadgeData[user.id].length;

        const newBadgeData: BadgeInfo = {
            tooltip: tooltip,
            badge: badgeUrl
        };
        if (imgData2x) newBadgeData["2"] = 1;
        if (!tooltip || tooltip === ZWSP) delete newBadgeData.tooltip;

        const beforeIndex = data.options.getInteger("before");
        if (beforeIndex != null) {
            BadgeData[user.id].splice(beforeIndex, 0, newBadgeData);
        } else {
            const existingBadge = BadgeData[user.id][index];
            if (existingBadge && BadgeData[user.id].filter(b => b.badge === existingBadge.badge).length === 1) {
                const existingFileName = new URL(existingBadge.badge).pathname.split("/").pop()!;
                removeBadgeImage(user.id, existingFileName);
            }

            BadgeData[user.id][index] = newBadgeData;
        }

        writeBadgeImage(user.id, fileName, imgData, imgData2x);

        saveBadges();

        if (guild) {
            const member = await guild.getMember(user.id).catch(() => null);
            if (member && !member.roles.includes(Config.roles.donor))
                await member.addRole(Config.roles.donor); {
            }
        }

        logBotAuditAction({
            content: `Badge ${subCommand === "edit" ? "edited" : "added"} for ${user.username} (${user.mention})`,
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
    name: COMMAND_NAME,
    options: [
        {
            name: "add",
            description: "Add a new badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [
                RequiredUser,
                makeTooltip(true),
                ImageUrl,
                Image,
                makeExistingBadge("before", false),
                Optimize
            ]
        },
        {
            name: "edit",
            description: "Edit an existing badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [
                RequiredUser,
                makeExistingBadge("badge"),
                makeTooltip(false),
                ImageUrl,
                Image,
                Optimize
            ]
        },
        {
            name: "remove",
            description: "Remove an existing badge",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [RequiredUser, makeExistingBadge("badge")]
        },
        {
            name: "remove-all",
            description: "Remove all badges from a user",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [RequiredUser]
        },
        {
            name: "move",
            description: "Move a badge from one user to another",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [OldUser, NewUser]
        },
        {
            name: "copy",
            description: "Copy a badge from one user to another",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [OldUser, NewUser]
        },
        {
            name: "add-bulk",
            description: "Add multiple badges to a user at once",
            type: ApplicationCommandOptionTypes.SUB_COMMAND,
            options: [
                RequiredUser,
                <CommandStringOption name="text" required description="The text to parse for badges" />,
                Optimize
            ]
        }
    ]
});
