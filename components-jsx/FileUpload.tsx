import { ComponentTypes, ModalFileUploadComponent } from "oceanic.js";

export type FileUploadProps = Omit<ModalFileUploadComponent, "type">;

export function FileUpload({ ...props }: FileUploadProps): ModalFileUploadComponent {
    return {
        type: ComponentTypes.FILE_UPLOAD,
        ...props
    };
}
