import { Member } from "oceanic.js";

import { ID_REGEX } from "~/util";

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

export function parseUserIdsAndReason(args: string[], defaultReason: string = "No reason provided") {
    const ids = [] as string[];
    let reason = defaultReason;
    let hasCustomReason = false;
    for (let i = 0; i < args.length; i++) {
        const id = args[i].match(ID_REGEX)?.[1];
        if (id) {
            ids.push(id);
        } else {
            reason = args.slice(i).join(" ");
            hasCustomReason = true;
            break;
        }
    }

    return { ids, reason, hasCustomReason };
}
