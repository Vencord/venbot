import { ComponentTypes, TextDisplayComponent } from "oceanic.js";

import { childrenToString } from "./utils";

export interface TextDisplayProps {
    children?: any;
    id?: number;
}

export function TextDisplay({ children, id }: TextDisplayProps): TextDisplayComponent {
    children = childrenToString("TextDisplay", children);
    if (!children) {
        throw new Error("TextDisplay requires at least one child");
    }

    return {
        type: ComponentTypes.TEXT_DISPLAY,
        content: children,
        id,
    };
}
