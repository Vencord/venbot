export class TTLMap<K, V> extends Map<K, V> {
    private readonly _timers = new Map<K, NodeJS.Timeout>();

    public constructor(public readonly expiryMs: number) {
        super();
    }

    public set(key: K, value: V) {
        const timeoutId = setTimeout(() => this.delete(key), this.expiryMs);
        this._timers.set(key, timeoutId);

        return super.set(key, value);
    }

    public delete(key: K) {
        if (this._timers.has(key)) {
            clearTimeout(this._timers.get(key));
            this._timers.delete(key);
        }

        return super.delete(key);
    }

    clear(): void {
        for (const timeoutId of this._timers.values())
            clearTimeout(timeoutId);

        this._timers.clear();
        return super.clear();
    }
}
