import { ComponentTypes, ThumbnailComponent } from "oceanic.js";

export type ThumbnailProps = Omit<ThumbnailComponent, "type" | "media"> & { url: string; };

export function Thumbnail({ url, ...props }: ThumbnailProps): ThumbnailComponent {
    return {
        type: ComponentTypes.THUMBNAIL,
        media: { url },
        ...props
    };
}
