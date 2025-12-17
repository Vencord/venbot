import { createWriteStream } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

import { Millis } from "~/constants";

import Config from "~/config";
import { ttlLazy } from "./lazy";

type Url = string | URL;

export async function doFetch(url: Url, options?: RequestInit) {
    const res = await fetch(url, options);
    if (res.ok)
        return res;

    let message = `${options?.method ?? "GET"} ${url}: ${res.status} ${res.statusText}`;
    try {
        const reason = await res.text();
        message += `\n${reason.slice(0, 500)}`;
    } catch { }

    throw new Error(message);
}

export async function fetchBuffer(url: Url, options?: RequestInit) {
    const res = await doFetch(url, options);
    return Buffer.from(await res.arrayBuffer());
}

export async function fetchJson<T = any>(url: Url, options?: RequestInit) {
    const res = await doFetch(url, options);
    return res.json() as Promise<T>;
}

export async function downloadToFile(url: Url, path: string, options?: RequestInit) {
    const res = await doFetch(url, options);
    if (!res.body) throw new Error(`Download ${url}: response body is empty`);

    const body = Readable.fromWeb(res.body);
    await finished(body.pipe(createWriteStream(path)));
}

export function makeCachedJsonFetch<T>(url: string, ttl = 5 * Millis.MINUTE) {
    return ttlLazy(
        () => doFetch(url).then(res => res.json() as Promise<T>),
        ttl
    );
}

export const fetchGoogle: typeof doFetch = async (url, options?) => {
    const { secret, url: proxyUrl } = Config.googleProxy;
    if (!secret || !proxyUrl) {
        return doFetch(url, options);
    }

    const finalUrl = new URL(proxyUrl);
    finalUrl.searchParams.set("url", url.toString());

    options = {
        ...options,
        headers: {
            ...options?.headers,
            "Secret": secret,
        }
    };

    return doFetch(finalUrl, options);
};
