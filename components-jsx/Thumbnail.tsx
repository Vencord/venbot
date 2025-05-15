import { ComponentTypes, ThumbnailComponent } from "oceanic.js";

export type ThumbnailProps = Omit<ThumbnailComponent, "type" | "media"> & { children: ThumbnailComponent["media"] };

export function Thumbnail(props: ThumbnailProps): ThumbnailComponent {
    return {
        type: ComponentTypes.THUMBNAIL,
        media: props.children,
        ...props
    };
}
