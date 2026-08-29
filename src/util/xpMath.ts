import { Message } from "oceanic.js";

export function getXpForLevel(level: number): number {
    return Math.ceil((5 / 2) * (-1 + 20 * Math.pow(level, 2)));
}

export function getLevelForXp(xp: number): number {
    return Math.floor(Math.sqrt(2 * xp + 5) / 10);
}

export function getRequiredXpForNextLevel(xp: number): number {
    return getXpForLevel(getLevelForXp(xp) + 1);
}

export function getXpForMessage(message: Message) {
    return Math.min(Math.ceil((message.content.length / 10) ** 2), 30);
}
