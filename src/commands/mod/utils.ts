import { Member } from "oceanic.js";

export function hasHigherRoleThan(roleId: string, member: Member) {
    const g = member.guild;
    const pos = g.roles.get(roleId)!.position;

    return member.roles.some(r => g.roles.get(r)!.position > pos);
}

export function getHighestRolePosition({ roles, guild }: Member) {
    return roles.reduce((position, role) =>
        Math.max(position, guild.roles.get(role)!.position),
        0
    );
}
