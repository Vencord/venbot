import { ComponentTypes, type ModalLabel as TModalLabel } from "oceanic.js";
import { singleChild } from "./utils";

export type LabelProps = Omit<TModalLabel, "type" | "component"> & { children: TModalLabel["component"]; };

export function ModalLabel({ children, ...restProps }: LabelProps): TModalLabel {
    return {
        type: ComponentTypes.LABEL,
        component: singleChild("ModalLabel", children),
        ...restProps
    };
}
