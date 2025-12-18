import { createHash, randomUUID } from "crypto";
import { closeSync, fsyncSync, openSync, renameSync, statSync, unlinkSync, writeSync } from "fs";
import { dirname } from "path";
import { ignoreErrors } from "./functions";

export function atomicWriteFileSync(filePath: string, data: string | Buffer) {
    const suffix = createHash("sha1")
        .update(String(process.pid))
        .update(String(randomUUID()))
        .digest("hex");

    const tmpFileName = filePath + "." + suffix;

    let mode = 0o644;
    ignoreErrors(() => {
        mode = statSync(filePath).mode;
    });

    let fd: number | null = null;
    let dfd: number | null = null;
    try {
        fd = openSync(tmpFileName, "w", mode);

        let offset = 0;
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        while (offset < buffer.length) {
            offset += writeSync(fd, buffer, offset);
        }

        fsyncSync(fd);
        closeSync(fd);
        fd = null;

        renameSync(tmpFileName, filePath);

        dfd = openSync(dirname(filePath), "r");
        fsyncSync(dfd);
    } finally {
        ignoreErrors(() => unlinkSync(tmpFileName));
        ignoreErrors(() => fd && closeSync(fd));
        ignoreErrors(() => dfd && closeSync(dfd));
    }
}
