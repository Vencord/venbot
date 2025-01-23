export function makeLazy<T>(factory: () => T): () => T {
    let value: T | null = null;
    let initialized = false;

    return () => {
        if (!initialized) {
            initialized = true;
            value = factory();
        }

        return value!;
    };
}

export function ttlLazy<Args extends unknown[], Res>(factory: (...args: Args) => Res, ttl: number): (...args: Args) => Res {
    let cachedValue: Res | null = null;
    let cacheTimestamp = 0;

    return (...args: Args) => {
        if (Date.now() - cacheTimestamp > ttl) {
            cachedValue = factory(...args);
            cacheTimestamp = Date.now();
        }

        return cachedValue!;
    };
}
