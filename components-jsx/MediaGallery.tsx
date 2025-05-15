import { ComponentTypes, MediaGalleryComponent } from "oceanic.js";

import { childrenToArray } from "./utils";

export type MediaGalleryProps = Omit<MediaGalleryComponent, "type" | "items"> & { children: MediaGalleryComponent["items"] };

export function MediaGallery(props: MediaGalleryProps): MediaGalleryComponent {
    return {
        type: ComponentTypes.MEDIA_GALLERY,
        items: childrenToArray(props.children),
        ...props
    };
}
