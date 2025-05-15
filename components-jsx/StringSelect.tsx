import { ComponentTypes, StringSelectMenu } from "oceanic.js";

import { childrenToArray } from "./utils";

export type StringSelectProps = Omit<StringSelectMenu, "type" | "options"> & { children: StringSelectMenu["options"] };

export function StringSelect(props: StringSelectProps): StringSelectMenu {
    return {
        type: ComponentTypes.STRING_SELECT,
        options: childrenToArray(props.children),
        ...props
    };
}
