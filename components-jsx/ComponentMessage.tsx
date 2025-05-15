import { CreateMessageOptions, EditMessageOptions, MessageComponent, MessageFlags } from "oceanic.js";

import { childrenToArray } from "./utils";

type MessageOptions = CreateMessageOptions | EditMessageOptions;
export type ComponentMessageProps = MessageOptions & { children: MessageComponent[]; };

export function ComponentMessage({ children, flags, ...props }: ComponentMessageProps): MessageOptions {
    return {
        flags: MessageFlags.IS_COMPONENTS_V2 | (flags ?? 0),
        components: childrenToArray(children),
        ...props
    };
}
