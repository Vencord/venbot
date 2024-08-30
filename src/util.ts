import { CreateMessageOptions, Message, User } from "oceanic.js";

import { Vaius } from "./Client";
import { GUILD_ID } from "./env";
import { doFetch } from "./util/fetch";

export const ZWSP = "\u200B";
export const ID_REGEX = /^(?:<@!?)?(\d{17,20})>?$/;

export const NOOP = () => { };
export const swallow = NOOP;

export function reply(msg: Message, opts: CreateMessageOptions | string): Promise<Message> {
    if (typeof opts === "string")
        opts = {
            content: opts
        };

    return msg.client.rest.channels.createMessage(msg.channelID, {
        ...opts,
        messageReference: {
            messageID: msg.id,
            channelID: msg.channelID,
            guildID: msg.guildID!
        }
    });
}

export function sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
}

const BACKTICKS = "```";
export const codeblock = (s: string, lang = "") => `${BACKTICKS}${lang}\n${s.replaceAll("`", "`" + ZWSP)}${BACKTICKS}`;

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

export async function silently<T extends Promise<any>>(p?: T) {
    try {
        return await p;
    } catch { }
}

export const checkPromise = (p: Promise<any>) =>
    p
        .then(() => true)
        .catch(() => false);

export async function sendDm(user: User, data: CreateMessageOptions) {
    const dm = await silently(user.createDM());
    if (!dm) return false;

    return dm.createMessage(data)
        .catch(() => false as const);
}

export function makeCachedJsonFetch<T>(url: string, msUntilStale = 60_000 * 5) {
    let cachedValue: unknown;
    let cacheTimestamp = 0;

    return async () => {
        if (Date.now() - cacheTimestamp > msUntilStale) {
            const res = await doFetch(url);

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

export async function getAsMemberInMainGuild(userId: string) {
    const guild = Vaius.guilds.get(GUILD_ID);
    if (!guild) return null;

    return guild.members.get(userId) ?? guild.getMember(userId).catch(() => null);
}
