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
