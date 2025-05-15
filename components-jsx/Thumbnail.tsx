import { ComponentTypes, ThumbnailComponent } from "oceanic.js";

export type ThumbnailProps = Omit<ThumbnailComponent, "type" | "media"> & { children: ThumbnailComponent["media"]; };

export function Thumbnail({ children, ...props }: ThumbnailProps): ThumbnailComponent {
    return {
        type: ComponentTypes.THUMBNAIL,
        media: children,
        ...props
    };
}
