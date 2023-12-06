import { createHash } from "crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { ApplicationCommandOptions, ApplicationCommandOptionTypes, ApplicationCommandTypes, InteractionTypes, MessageFlags } from "oceanic.js";
import { fetch } from "undici";

import { OwnerId, Vaius } from "../Client";
import { PROD } from "../constants";

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

const description = "fuck you discord";

Vaius.on("interactionCreate", async i => {
    if (i.user.id !== OwnerId) return;

    const { guild, type, data } = i;
    if (!guild) return;

    if (!("name" in data) || !data.name.startsWith(Name + "-")) return;

    if (type === InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE) {
        const user = data.options.getUserOption("user");
        const existingBadges = BadgeData[user?.value!];

        return i.result(existingBadges?.map((b, i) => ({ name: b.tooltip, value: String(i) }) ?? []));
    }

    if (type !== InteractionTypes.APPLICATION_COMMAND) return;

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
        saveBadges();

        return i.createMessage({
            content: "Done!",
            flags: MessageFlags.EPHEMERAL
        });
    }

    const tooltip = data.options.getString("tooltip", true);
    const image = data.options.getAttachment("image");
    const imageUrl = data.options.getString("image-url");

    const url = image?.url ?? imageUrl;

    if (!url)
        return i.createMessage({
            content: "bruh",
            flags: MessageFlags.EPHEMERAL
        });

    i.defer(MessageFlags.EPHEMERAL);

    const buf = await fetch(url).then(r => r.arrayBuffer());
    const imgData = new Uint8Array(buf);

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
        tooltip,
        badge: `https://badges.vencord.dev/badges/${user.id}/${fileName}`
    };

    saveBadges();

    i.createFollowup({
        content: "Done!",
        flags: MessageFlags.EPHEMERAL
    });
});

Vaius.once("ready", () => {
    const CommonOptions = [
        {
            name: "user",
            type: ApplicationCommandOptionTypes.USER,
            description,
            required: true
        },
        {
            name: "tooltip",
            type: ApplicationCommandOptionTypes.STRING,
            description,
            required: true
        },
        {
            name: "image",
            type: ApplicationCommandOptionTypes.ATTACHMENT,
            description
        },
        {
            name: "image-url",
            type: ApplicationCommandOptionTypes.STRING,
            description
        }
    ] satisfies ApplicationCommandOptions[];

    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameEdit,
        description,
        defaultMemberPermissions: "0", // admins only,
        options: ([
            ...CommonOptions,
            {
                name: "old-badge",
                description,
                type: ApplicationCommandOptionTypes.INTEGER,
                autocomplete: true,
                required: true
            }
        ] as ApplicationCommandOptions[]).sort((a, b) => Number(b.required ?? false) - Number(a.required ?? false))
    });

    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameAdd,
        description,
        defaultMemberPermissions: "0", // admins only,
        options: CommonOptions
    });

    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameRemove,
        description,
        defaultMemberPermissions: "0",
        options: [
            CommonOptions[0],
            {
                name: "old-badge",
                description,
                type: ApplicationCommandOptionTypes.INTEGER,
                autocomplete: true,
                required: true
            }
        ]
    });

    Vaius.application.createGuildCommand("1015060230222131221", {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: NameMove,
        description,
        defaultMemberPermissions: "0", // admins only,
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
