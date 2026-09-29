import { Message, MessageFlags } from "oceanic.js";

import { reply } from "~/util/discord";
import { doFetch } from "~/util/fetch";
import { silently } from "~/util/functions";
import { isTruthy } from "~/util/guards";
import { stripIndentString, toCodeblock } from "~/util/text";

const GITHUB_LINK_REGEX = /(?<!<)https?:\/\/github\.com\/([^\s/]+)\/([^\s/#?]+)\/blob\/([^\s/#?]+)\/([^\s#?]+)#L(\d+)(?:-L?(\d+))?/gi;

function findGithubLineLinks(input: string) {
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
        .filter(isTruthy);
}

export async function resolveGithubLines(input: string) {
    const links = findGithubLineLinks(input);

    return Promise.all(links.map(async ({ owner, repo, ref, path, start, end }) => {
        const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${ref.split("/").map(encodeURIComponent).join("/")}/${path.split("/").map(encodeURIComponent).join("/")}`;

        const fileContent = await doFetch(url, { headers: { "User-Agent": "Venbot" } })
            .then(res => res.text());

        const lines = stripIndentString(fileContent).split(/\r?\n/);

        return {
            name: path.split("/").pop()!,
            path,
            content: lines.slice(start - 1, end).join("\n"),
            url: `https://github.com/${owner}/${repo}/blob/${ref}/${path}#L${start}-L${end}`
        };
    }));
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
