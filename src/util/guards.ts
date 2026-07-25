export function isTruthy<T>(item: T): item is Exclude<T, 0 | "" | false | null | undefined> {
    return Boolean(item);
}

export function isNonNullish<T>(item: T): item is Exclude<T, null | undefined> {
    return item != null;
}

export function isOneOf<T, U extends T>(item: T, ...values: U[]): item is U {
    return values.includes(item as U);
}
