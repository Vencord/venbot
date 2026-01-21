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

export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const truthy: T[] = [];
    const falsy: T[] = [];

    for (const item of arr) {
        if (predicate(item)) {
            truthy.push(item);
        } else {
            falsy.push(item);
        }
    }

    return [truthy, falsy];
}

export function deleteElement<T>(arr: T[], element: T): boolean {
    const index = arr.indexOf(element);
    if (index === -1) return false;
    arr.splice(index, 1);
    return true;
}
