import { ComponentTypes, MessageActionRow, MessageActionRowComponent } from "oceanic.js";

import { childrenToArray } from "./utils";

export type ActionRowProps = Omit<MessageActionRow, "type" | "components"> & { children: MessageActionRowComponent | MessageActionRowComponent[]; };

export function ActionRow(props: ActionRowProps): MessageActionRow {
    return {
        type: ComponentTypes.ACTION_ROW,
        components: childrenToArray(props.children),
        ...props
    };
}
