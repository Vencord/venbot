import { ComponentTypes, ContainerComponent } from "oceanic.js";

import { childrenToArray } from "./utils";

export type ContainerProps = Omit<ContainerComponent, "type" | "components"> & { children: ContainerComponent["components"]; };

export function Container({ children, ...props }: ContainerProps): ContainerComponent {
    return {
        type: ComponentTypes.CONTAINER,
        components: childrenToArray(children),
        ...props
    };
}
