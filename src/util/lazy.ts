import { indent, stripIndent } from "./text";

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

/**
 * Return this value from the factory to skip caching the result and make this call return `null
 */
export const ttlLazyFailure = Symbol("TtlLazySkip");
type TtlLazyFailure = typeof ttlLazyFailure;

type TtlLazyReturn<Res> = Res extends Promise<infer T>
    ? Promise<TtlLazyReturn<T>>
    : TtlLazyFailure extends Res
    ? Exclude<Res, TtlLazyFailure> | null
    : Res;

export function ttlLazy<Args extends unknown[], Res>(factory: (...args: Args) => Res, ttl: number): (...args: Args) => TtlLazyReturn<Res> {
    let cachedValue: Res | null = null;
    let cacheTimestamp = 0;

    const wrapper = (...args: Args) => {
        if (Date.now() - cacheTimestamp > ttl) {
            let res = factory(...args);
            if (res === ttlLazyFailure) {
                return null;
            }

            if (res instanceof Promise) {
                res = res.then(r => {
                    if (r === ttlLazyFailure) {
                        cacheTimestamp = 0;
                        return null;
                    }

                    return r;
                }) as any;
            }

            cachedValue = res;
            cacheTimestamp = Date.now();
        }

        return cachedValue!;
    };

    return <any>Object.assign(
        wrapper,
        {
            wrappedFunction: factory,
            toString() {
                const format = stripIndent`
                    ttlLazy(
                        %s,
                        ${ttl}
                    )
                `;

                const twelveSpaces = " ".repeat(12);
                // hack: some functions might have indentation, but the first line won't.
                // adding 12 spaces at the start and removing it again ensures it will strip indentation
                // correctly even if the first line is not indented
                const trimmedFactory = stripIndent`${twelveSpaces}${factory}`.replace(new RegExp(`^${twelveSpaces}`), "");

                return format.replace("%s", indent(trimmedFactory, 4).trimStart());
            }
        }
    );
}
