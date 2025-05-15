import { ComponentTypes, FileComponent } from "oceanic.js";

import { MediaItem } from "./MediaItem";

interface FileProps {
    filename: string;
    id?: number;
    spoiler?: boolean;
}

export function File({ filename, id, spoiler }: FileProps): FileComponent {
    return {
        type: ComponentTypes.FILE,
        id,
        spoiler,
        file: <MediaItem url={`attachment://${filename}`} />,
    };
}
