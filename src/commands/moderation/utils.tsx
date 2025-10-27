import { ButtonStyles, Member, User } from "oceanic.js";
import { ZWSP } from "~/constants";

import { getHighestRole, ID_REGEX } from "~/util/discord";
import { logModerationAction } from "~/util/logAction";
import { ActionRow, Button } from "~components";

export function hasHigherRoleThan(roleId: string, member: Member) {
    const g = member.guild;
    const pos = g.roles.get(roleId)!.position;

    return member.roles.some(r => g.roles.get(r)!.position > pos);
}

export function getHighestRolePosition(member: Member) {
    return getHighestRole(member)?.position ?? 0;
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

export function logUserRestriction(data: {
    title: string;
    user?: User;
    id: string;
    reason: string;
    moderator: User;
    jumpLink: string;
    color?: number;
}) {
    const { title, user, id, reason, moderator, jumpLink, color } = data;

    logModerationAction({
        content: `# ${title}`,
        embeds: [
            {
                author: {
                    name: user ? user.tag : id,
                    iconURL: user?.avatarURL(undefined, 128),
                },
                description: `${id} - <@${id}>\n### Reason\n${reason}\n${ZWSP}`,
                color,
                footer: {
                    text: `Moderator: ${moderator.tag}`,
                    iconURL: moderator.avatarURL(undefined, 128),
                }
            }
        ],
        components: [
            <ActionRow>
                <Button style={ButtonStyles.LINK} url={jumpLink}>Jump to context</Button>
            </ActionRow>
        ]
    });
}
