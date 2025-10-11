import { ChannelSelectMenu, ComponentTypes } from "oceanic.js";

export type ChannelSelectProps = Omit<ChannelSelectMenu, "type">;

export function ChannelSelect(props: ChannelSelectProps): ChannelSelectMenu {
    return {
        type: ComponentTypes.CHANNEL_SELECT,
        ...props
    };
}
