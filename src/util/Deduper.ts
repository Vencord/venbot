export class Deduper<T> extends Set<T> {
    private readonly _timers = new Map<T, NodeJS.Timeout>();

    public constructor(public readonly expiryMs?: number) {
        super();
    }

    public add(key: T) {
        if (this.expiryMs) {
            const timeoutId = setTimeout(() => this.delete(key), this.expiryMs);
            this._timers.set(key, timeoutId);
        }

        return super.add(key);
    }

    public delete(key: T) {
        if (this.expiryMs && this._timers.has(key)) {
            clearTimeout(this._timers.get(key));
            this._timers.delete(key);
        }

        return super.delete(key);
    }

    /**
     * Adds the key if it doesn't exist, and returns whether it was already present
     * @param key The key to add
     * @returns Whether the key was already present
     */
    public getOrAdd(key: T) {
        if (this.has(key)) return true;

        this.add(key);
        return false;
    }

    public clear() {
        for (const timeoutId of this._timers.values())
            clearTimeout(timeoutId);

        this._timers.clear();
        return super.clear();
    }
}
