import { ComponentTypes, MentionableSelectMenu } from "oceanic.js";

export type MentionableSelectProps = Omit<MentionableSelectMenu, "type">;

export function MentionableSelect(props: MentionableSelectProps): MentionableSelectMenu {
    return {
        type: ComponentTypes.MENTIONABLE_SELECT,
        ...props
    };
}
