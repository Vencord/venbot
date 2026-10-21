import { Message, MessageFlags } from "oceanic.js";

import { reply } from "~/util/discord";
import { doFetch } from "~/util/fetch";
import { silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { stripIndentString, toCodeblock } from "~/util/text";

const GITHUB_LINK_REGEX = /(?<!<)https?:\/\/github\.com\/([^\s/]+)\/([^\s/#?]+)\/blob\/([^\s/#?]+)\/([^\s#?]+)#L(\d+)(?:-L?(\d+))?/gi;

const MAX_LINKS_PER_MESSAGE = 3;
const MAX_FILE_BYTES = 1 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

async function fetchFileText(url: string): Promise<string | null> {
    const res = await doFetch(url, {
        headers: { "User-Agent": "Venbot" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    }, { retryCount: 0 }).catch(() => null);

    if (!res) return null;

    const contentLength = Number(res.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) return null;
    if (!res.body) return "";

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            total += value.byteLength;
            if (total > MAX_FILE_BYTES) {
                await reader.cancel();
                return null;
            }

            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString("utf8");
}

interface GithubLineLink {
    owner: string;
    repo: string;
    ref: string;
    path: string;
    start: number;
    end: number;
}

function findGithubLineLinks(input: string): GithubLineLink[] {
    return input.matchAll(GITHUB_LINK_REGEX)
        .map(match => {
            const [, owner, repo, ref, encodedPath, firstLine, lastLine] = match;
            const start = Number(firstLine);
            const end = Number(lastLine ?? firstLine);

            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) return;

            try {
                return {
                    owner,
                    repo,
                    ref: decodeURIComponent(ref),
                    path: encodedPath.split("/").map(decodeURIComponent).join("/"),
                    start,
                    end
                };
            } catch { }
        })
        .filter((link): link is GithubLineLink => link != null)
        .toArray();
}

export async function resolveGithubLines(input: string) {
    const seen = new Set<string>();
    const links: GithubLineLink[] = [];

    for (const link of findGithubLineLinks(input)) {
        const key = `${link.owner}/${link.repo}/${link.ref}/${link.path}/${link.start}/${link.end}`;
        if (seen.has(key)) continue;

        seen.add(key);
        links.push(link);

        if (links.length >= MAX_LINKS_PER_MESSAGE) break;
    }

    return (await Promise.all(links.map(async ({ owner, repo, ref, path, start, end }) => {
        const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${ref.split("/").map(encodeURIComponent).join("/")}/${path.split("/").map(encodeURIComponent).join("/")}`;

        const fileContent = await fetchFileText(url);
        if (fileContent === null) return;

        const lines = stripIndentString(fileContent).split(/\r?\n/);

        return {
            name: path.split("/").pop()!,
            path,
            content: lines.slice(start - 1, end).join("\n"),
            url: `https://github.com/${owner}/${repo}/blob/${ref}/${path}#L${start}-L${end}`
        };
    }))).filter(isTruthy);
}

export async function handleGithubLines(msg: Message) {
    if (!msg.content.includes("github.com/")) return;

    const files = await silently(resolveGithubLines(msg.content));
    if (!files?.length) return;

    const content = files
        .map(file => {
            const ext = file.name.split(".").pop();
            const language = ext && /^\w+$/.test(ext) ? ext : undefined;

            return `**${file.path}**\n${toCodeblock(file.content, language)}`;
        })
        .join("\n\n");

    if (content.length > 2000) return;

    silently(
        reply(msg, { content }).then(() => msg.edit({ flags: msg.flags | MessageFlags.SUPPRESS_EMBEDS }))
    );
}
