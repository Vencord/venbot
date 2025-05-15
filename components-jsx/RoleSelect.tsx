import { ComponentTypes, RoleSelectMenu } from "oceanic.js";

export type RoleSelectProps = Omit<RoleSelectMenu, "type">;

export function RoleSelect(props: RoleSelectProps): RoleSelectMenu {
    return {
        type: ComponentTypes.ROLE_SELECT,
        ...props
    };
}
