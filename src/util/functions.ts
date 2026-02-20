import { DiscordRESTError } from "oceanic.js";

/**
 * Intended to be used as an alternative to IIFE, e.g.
 *
 * ```js
 * const thing = run(() => {
 *    if (someCondition) return "a";
 *    if (otherCondition) return "b";
 *    return "c";
 * });
 * ```
 */
export function run<T>(fn: () => T): T {
    return fn();
}

export function isObject(value: unknown): value is object {
    return value !== null && typeof value === "object";
}

export const NOOP = () => { };
export const swallow = NOOP;

export async function silently<T extends Promise<any>>(p?: T) {
    try {
        return await p;
    } catch { }
}

export const checkPromise = (p: Promise<any>) =>
    p
        .then(() => true)
        .catch(() => false);

export function debounce<T extends Function>(func: T, delay = 300): T {
    let timeout: NodeJS.Timeout;
    return function (...args: any[]) {
        clearTimeout(timeout);
        timeout = setTimeout(() => { func(...args); }, delay);
    } as any;
}

export function ignoreErrors<F extends () => any>(fn: F): ReturnType<F> | null {
    try {
        return fn();
    } catch {
        return null;
    }
}

// https://gist.github.com/Dziurwa14/de2498e5ee28d2089f095aa037957cbb
const ignoredErrors = [
    10007, // Unknown Member
    10008, // Unknown Message
];
export async function ignoreExpectedErrors<T>(p: Promise<T>): Promise<T | null> {
    try {
        return await p;
    } catch (e) {
        if (e instanceof DiscordRESTError && ignoredErrors.includes(e.code))
            return null;

        if (isObject(e))
            Error.captureStackTrace(e, ignoreExpectedErrors);

        throw e;
    }
}
