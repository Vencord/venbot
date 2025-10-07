export function isBitSet(num: number, bit: number): boolean;
export function isBitSet(num: bigint, bit: bigint): boolean;
export function isBitSet(num: bigint | number, bit: bigint | number) {
    // @ts-ignore
    return (num & bit) === bit;
}

