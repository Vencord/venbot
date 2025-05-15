import { ComponentTypes, TextInput } from "oceanic.js";

export { TextInputStyles } from "oceanic.js";

export type TextInputProps = Omit<TextInput, "type">;

export function TextInput(props: TextInputProps): TextInput {
    return {
        type: ComponentTypes.TEXT_INPUT,
        ...props
    };
}
