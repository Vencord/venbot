export function groupBy<T, K extends PropertyKey>(arr: T[], keyFn: (item: T) => K) {
    const map = {} as Record<K, T[]>;

    for (const item of arr) {
        const key = keyFn(item);
        map[key] ??= [];
        map[key].push(item);
    }

    return map;
}

export function deduplicate<T>(arr: T[]): T[] {
    return arr.filter((item, index) => arr.indexOf(item) === index);
}
