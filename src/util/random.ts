import { toHexColorString } from "./text";

export function randomFloat(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
    return Math.floor(randomFloat(min, max + 1));
}

export function randomChoice<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

export function randomHexColor(): string {
    return toHexColorString(randomInt(0, 0xFFFFFF));
}
