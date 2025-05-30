import { ButtonComponent, ComponentTypes, TextButton, URLButton } from "oceanic.js";

import { childrenToString } from "./utils";

export { ButtonStyles } from "oceanic.js";

type Button = Omit<TextButton, "type" | "label"> | Omit<URLButton, "type" | "label">;
export type ButtonProps = Button & { children?: any; };

export function Button({ children, ...props }: ButtonProps): ButtonComponent {
    return {
        type: ComponentTypes.BUTTON,
        label: childrenToString("Button", children) ?? undefined,
        ...props
    };
}
