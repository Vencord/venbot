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
