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
