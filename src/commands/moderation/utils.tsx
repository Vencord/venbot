import { ButtonStyles, Member, SeparatorSpacingSize, User } from "oceanic.js";

import { getHighestRole, ID_REGEX } from "~/util/discord";
import { logModerationAction } from "~/util/logAction";
import { ActionRow, Button, ComponentMessage, ComponentMessageProps, Container, Section, Separator, TextDisplay, Thumbnail } from "~components";

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

export async function logUserRestriction(data: {
    title: string;
    user?: User;
    id: string;
    reason: string;
    moderator: User;
    jumpLink: string | null;
    color?: ModerationColor;
    expires?: Date;
    extraContext?: any;
    messageProps?: Omit<ComponentMessageProps, "children">;
}) {
    const { title, user, id, reason, moderator, jumpLink, color, expires, extraContext, messageProps } = data;

    logModerationAction(
        <ComponentMessage {...messageProps}>
            <Container accentColor={color}>
                {user
                    ? (
                        <Section accessory={<Thumbnail url={user.avatarURL(undefined, 128)} />}>
                            <TextDisplay>## {title}</TextDisplay>
                            <TextDisplay>**{user.tag}**</TextDisplay>
                            <TextDisplay>-# {`<@${id}>`} - {id}</TextDisplay>
                        </Section>
                    )
                    : <TextDisplay>## {title} {`<@${id}>`}</TextDisplay>
                }

                <TextDisplay>**Reason**</TextDisplay>
                <TextDisplay>{reason}</TextDisplay>
                {extraContext}

                <Separator spacing={SeparatorSpacingSize.LARGE} />

                {expires && <TextDisplay>**Expires:** {`<t:${Math.floor(expires.getTime() / 1000)}:R>`}</TextDisplay>}
                <TextDisplay>-# by {moderator.tag}</TextDisplay>

                {!!jumpLink &&
                    <ActionRow>
                        <Button style={ButtonStyles.LINK} url={jumpLink}>Jump to context</Button>
                    </ActionRow>
                }
            </Container>
        </ComponentMessage>
    );
}

export enum ModerationColor {
    Severe = 0xffb3ba,
    Light = 0xffffba,
    Positive = 0xbaffc9
}
