import { createWriteStream } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

import { Millis } from "~/constants";

import Config from "~/config";
import { ttlLazy } from "./lazy";
import { sleep } from "./time";

type Url = string | URL;

/**
 * @param options.retryCount Number of times to retry on network failure. Default is 3.
 * @param options.retryDelayMs Delay between retries in milliseconds. Default is 1000.
 */
export async function doFetch(
    url: Url,
    init?: RequestInit,
    options: { retryCount?: number, retryDelayMs?: number; } = {}
): Promise<Response> {
    const { retryCount = 3, retryDelayMs = 1000 } = options;

    for (let attempt = 0; ; attempt++) {
        try {
            var res = await fetch(url, init);
            break;
        } catch (err) {
            if (attempt >= retryCount) throw err;

            await sleep(retryDelayMs);
        }
    }

    if (res.ok)
        return res;

    let message = `${init?.method ?? "GET"} ${url}: ${res.status} ${res.statusText}`;
    try {
        const reason = await res.text();
        message += `\n${reason.slice(0, 500)}`;
    } catch { }

    throw new Error(message);
}

export async function fetchBuffer(url: Url, init?: RequestInit) {
    const res = await doFetch(url, init);
    return Buffer.from(await res.arrayBuffer());
}

export async function fetchJson<T = any>(url: Url, options?: RequestInit) {
    const res = await doFetch(url, options);
    return res.json() as Promise<T>;
}

export async function downloadToFile(url: Url, path: string, init?: RequestInit) {
    const res = await doFetch(url, init);
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

export const fetchGoogle: typeof doFetch = async (url, init?) => {
    const { secret, url: proxyUrl } = Config.googleProxy;
    if (!secret || !proxyUrl) {
        return doFetch(url, init);
    }

    const finalUrl = new URL(proxyUrl);
    finalUrl.searchParams.set("url", url.toString());

    init = {
        ...init,
        headers: {
            ...init?.headers,
            "Secret": secret,
        }
    };

    return doFetch(finalUrl, init);
};
