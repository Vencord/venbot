import type { MediaGalleryItem as MediaGalleryItemComponent } from "oceanic.js";

import { MediaItem } from "./MediaItem";

export interface MediaGalleryItemProps {
    url: string;
    description?: string;
    spoiler?: boolean;
}

export function MediaGalleryItem({ url, description, spoiler }: MediaGalleryItemProps): MediaGalleryItemComponent {
    return {
        media: <MediaItem url={url} />,
        description,
        spoiler,
    };
}
