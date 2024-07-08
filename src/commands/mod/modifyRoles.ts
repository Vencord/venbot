import { AnyTextableGuildChannel, Member, Message } from "oceanic.js";

import { defineCommand } from "~/Command";
import { DONOR_ROLE_ID, Emoji } from "~/constants";
import { codeblock, ID_REGEX, reply, swallow } from "~/util";

const Aliases = {
    donor: DONOR_ROLE_ID,
    d: DONOR_ROLE_ID,

    cute: "1026504932959977532",
    c: "1026504932959977532",

    regular: "1026504932959977532",
    r: "1026504932959977532",

    needy: "1088566810976194693"
};

function parseArgs(msg: Message<AnyTextableGuildChannel>, args: string[]) {
    const { guild, referencedMessage } = msg;

    let userStart = args.findIndex(a => ID_REGEX.test(a));
    if (userStart === -1) {
        if (!referencedMessage)
            return { role: "", users: [] };

        userStart = args.length;
    }

    const roleName = args.slice(0, userStart).join(" ").toLowerCase();
    const role = Aliases[roleName as keyof typeof Aliases]
        ?? guild.roles.find(r => r.name.toLowerCase() === roleName)?.id
        ?? guild.roles.find(r => r.name.toLowerCase().includes(roleName))?.id;

    const users = args.slice(userStart).map(u => u.match(ID_REGEX)?.[1]);
    if (!users.length)
        users.push(referencedMessage!.author.id);

    if (users.includes(undefined) || !role)
        return { role: "", users: [] };

    return { role, users: users as string[] };
}

function canManageRole(roleId: string, member: Member) {
    const g = member.guild;
    const pos = g.roles.get(roleId)!.position;

    return member.roles.some(r => g.roles.get(r)!.position > pos);
}

defineCommand({
    name: "role-add",
    aliases: ["+", "ra"],
    description: "Add a role to one or more users",
    usage: "<role> <user> [user...]",
    guildOnly: true,
    permissions: ["MANAGE_ROLES"],
    async execute(msg, ...args) {
        const { role, users } = parseArgs(msg, args);
        if (!role) return msg.createReaction(Emoji.QuestionMark).catch(swallow);
        if (!canManageRole(role, msg.member)) return msg.createReaction(Emoji.Anger).catch(swallow);

        const failed = [] as string[];
        for (const u of users) {
            await msg.guild.addMemberRole(u, role, `Added by ${msg.author.tag}`)
                .catch(e => failed.push(String(e)));
        }

        if (!failed.length) return void msg.createReaction(Emoji.CheckMark).catch(swallow);

        return reply(msg, "Failed to give some users that role:\n" + codeblock(failed.join("\n")));
    },
});

defineCommand({
    name: "role-remove",
    aliases: ["-", "rr"],
    description: "Remove a role from one or more users",
    usage: "<role> <user> [user...]",
    guildOnly: true,
    permissions: ["MANAGE_ROLES"],
    async execute(msg, ...args) {
        const { role, users } = parseArgs(msg, args);
        if (!role) return msg.createReaction(Emoji.QuestionMark).catch(swallow);
        if (!canManageRole(role, msg.member)) return msg.createReaction(Emoji.Anger).catch(swallow);

        const failed = [] as string[];
        for (const u of users) {
            await msg.guild.removeMemberRole(u, role, `Removed by ${msg.author.tag}`)
                .catch(() => failed.push(u));
        }

        if (!failed.length) return void msg.createReaction(Emoji.CheckMark).catch(swallow);

        return reply(msg, "Failed to remove that role from some users:\n" + codeblock(failed.join("\n")));
    },
});
