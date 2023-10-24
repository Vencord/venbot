import { CreateMessageOptions, Message, User } from "oceanic.js";
import { fetch } from "undici";

const ZWSP = "\u200B";

export function reply(msg: Message, opts: CreateMessageOptions | string): Promise<Message> {
    if (typeof opts === "string")
        opts = {
            content: opts
        };

    return msg.channel!.createMessage({
        ...opts,
        messageReference: {
            messageID: msg.id,
            channelID: msg.channelID,
            guildID: msg.guildID!
        }
    });
}

export function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

const BACKTICKS = "```";
export const codeblock = (s: string, lang = "js") => `${BACKTICKS}${lang}\n${s.replaceAll("`", "`" + ZWSP)}${BACKTICKS}`;

export async function sendManyLines(msg: Message, lines: string[]) {
    let s = "";
    const doSend = () => msg.channel?.createMessage({ content: s });
    for (const line of lines) {
        if (s.length + line.length >= 2000) {
            await doSend();
            await sleep(500);
            s = "";
        }
        s += line + "\n";
    }
    if (s) await doSend();
}

export function formatTable(rows: string[][]) {
    const highestLengths = Array.from({ length: rows[0].length }, (_, i) => Math.max(...rows.map(r => r[i].length)));

    return ZWSP + rows.map(
        row => row.map((s, i) => s.padStart(highestLengths[i], " ")).join("    ")
    ).join("\n");
}

export function until(ms: number) {
    return new Date(Date.now() + ms).toISOString();
}

export async function silently<T>(p?: Promise<T>) {
    try {
        return await p;
    } catch { }
}

export async function sendDm(user: User, data: CreateMessageOptions) {
    const dm = await silently(user.createDM());
    return !!dm && dm?.createMessage(data).then(() => true).catch(() => false);
}

export function makeCachedJsonFetch<T>(url: string, msUntilStale = 60_000 * 5) {
    let cachedValue: unknown;
    let cacheTimestamp = 0;

    return async () => {
        if (Date.now() - cacheTimestamp > msUntilStale) {
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`Failed to get ${url} - ${res.status}: ${res.statusText}`);

            cachedValue = await res.json();
            cacheTimestamp = Date.now();
        }
        return cachedValue as T;
    };
}

export function debounce<T extends Function>(func: T, delay = 300): T {
    let timeout: NodeJS.Timeout;
    return function (...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => { func(...args); }, delay);
    } as any;
}
