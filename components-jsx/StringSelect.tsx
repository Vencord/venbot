import { ComponentTypes, SelectOption, StringSelectMenu } from "oceanic.js";

import { childrenToArray } from "./utils";

export type StringSelectProps = Omit<StringSelectMenu, "type" | "options"> & { children: StringSelectMenu["options"]; };

export function StringSelect({ children, ...props }: StringSelectProps): StringSelectMenu {
    return {
        type: ComponentTypes.STRING_SELECT,
        options: childrenToArray(children),
        ...props
    };
}

export function StringOption(props: SelectOption) {
    return props;
}
