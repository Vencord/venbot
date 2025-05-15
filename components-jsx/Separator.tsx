import { ComponentTypes, SeparatorComponent } from "oceanic.js";

export type SeparatorProps = Omit<SeparatorComponent, "type">;

export function Separator(props: SeparatorProps): SeparatorComponent {
    return {
        type: ComponentTypes.SEPARATOR,
        ...props
    };
}
