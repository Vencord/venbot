import { createWriteStream } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

type Url = string | URL;

export async function doFetch(url: Url, options?: RequestInit) {
    const res = await fetch(url, options);
    if (res.ok)
        return res;

    let message = `${options?.method ?? "GET"} ${url}: ${res.status} ${res.statusText}`;
    try {
        const reason = await res.text();
        message += `\n${reason}`;
    } catch { }

    throw new Error(message);
}

export async function fetchBuffer(url: Url, options?: RequestInit) {
    const res = await doFetch(url, options);
    return Buffer.from(await res.arrayBuffer());
}

export async function downloadToFile(url: Url, path: string, options?: RequestInit) {
    const res = await doFetch(url, options);
    if (!res.body) throw new Error(`Download ${url}: response body is empty`);

    const body = Readable.fromWeb(res.body);
    await finished(body.pipe(createWriteStream(path)));
}
