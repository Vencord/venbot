import { AnyTextableGuildChannel, Message } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { DONOR_ROLE_ID, Emoji, REGULAR_ROLE_ID } from "~/constants";
import { ID_REGEX } from "~/util/discord";
import { makeConstants } from "~/util/objects";
import { toCodeblock } from "~/util/text";

import { hasHigherRoleThan } from "./utils";

const Aliases = makeConstants({
    donor: DONOR_ROLE_ID,
    d: DONOR_ROLE_ID,

    cute: REGULAR_ROLE_ID,
    c: REGULAR_ROLE_ID,

    regular: REGULAR_ROLE_ID,
    r: REGULAR_ROLE_ID,

    needy: "1088566810976194693"
});

const ManageableRoles = [
    DONOR_ROLE_ID,
    REGULAR_ROLE_ID,
    "1026534353167208489", // contributor
    "1191202487978438656", // programming
    "1136687385434918992", // image sender
    "1018310742874791977", // brain rot
    "1118620309382254654", // can't talk
    "1173623814211506207", // can't vc
    "1161815552919076867", // no modmail
    "1088566810976194693", // needy
    "1061276426478813245", // no support
    "1205614728148422716", // no programming
    "1241355250129178775", // angelsachse (no german)
];

function parseArgs(msg: Message<AnyTextableGuildChannel>, args: string[]) {
    const { guild, referencedMessage } = msg;

    let userStart = args.findIndex(a => ID_REGEX.test(a));
    if (userStart === -1) {
        if (!referencedMessage)
            return { role: "", users: [] };

        userStart = args.length;
    }

    const candidates = msg.member.permissions.has("MANAGE_ROLES")
        ? guild.roles.toArray()
        : guild.roles.filter(r => ManageableRoles.includes(r.id));

    const roleName = args.slice(0, userStart).join(" ").toLowerCase();
    const role = Aliases[roleName as keyof typeof Aliases]
        ?? candidates.find(r => r.name.toLowerCase() === roleName)?.id
        ?? candidates.find(r => r.name.toLowerCase().includes(roleName))?.id;

    const users = args.slice(userStart).map(u => u.match(ID_REGEX)?.[1]);
    if (!users.length)
        users.push(referencedMessage!.author.id);

    if (users.includes(undefined) || !role)
        return { role: "", users: [] };

    return { role, users: users as string[] };
}



defineCommand({
    name: "role-add",
    aliases: ["+", "ra"],
    description: "Add a role to one or more users",
    usage: "<role> <user> [user...]",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, react, reply }, ...args) {
        const { role, users } = parseArgs(msg, args);
        if (!role) return react(Emoji.QuestionMark);
        if (!hasHigherRoleThan(role, msg.member)) return react(Emoji.Anger);

        const failed = [] as string[];
        for (const u of users) {
            await msg.guild.addMemberRole(u, role, `Added by ${msg.author.tag}`)
                .catch(e => failed.push(String(e)));
        }

        if (!failed.length) return void react(Emoji.CheckMark);

        return reply("Failed to give some users that role:\n" + toCodeblock(failed.join("\n")));
    },
});

defineCommand({
    name: "role-remove",
    aliases: ["-", "rr"],
    description: "Remove a role from one or more users",
    usage: "<role> <user> [user...]",
    guildOnly: true,
    modOnly: true,
    async execute({ msg, reply, react }, ...args) {
        const { role, users } = parseArgs(msg, args);
        if (!role) return react(Emoji.QuestionMark);
        if (!hasHigherRoleThan(role, msg.member)) return react(Emoji.Anger);

        const failed = [] as string[];
        for (const u of users) {
            await msg.guild.removeMemberRole(u, role, `Removed by ${msg.author.tag}`)
                .catch(() => failed.push(u));
        }

        if (!failed.length) return void react(Emoji.CheckMark);

        return reply("Failed to remove that role from some users:\n" + toCodeblock(failed.join("\n")));
    },
});
