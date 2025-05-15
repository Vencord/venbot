import { ComponentTypes, UserSelectMenu } from "oceanic.js";

export type UserSelectProps = Omit<UserSelectMenu, "type">;

export function UserSelect(props: UserSelectProps): UserSelectMenu {
    return {
        type: ComponentTypes.USER_SELECT,
        ...props
    };
}
