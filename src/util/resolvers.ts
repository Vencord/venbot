import { Guild } from "oceanic.js";

import { Vaius } from "~/Client";

const idRegex = /\d{17,20}/;

export function resolveUserId(input: string) {
    if (!input) return null;

    const match = input.match(idRegex);
    if (match)
        return match[0];

    return Vaius.users.find(u => u.username === input)?.id ?? null;
}

export async function resolveUser(input: string) {
    const id = resolveUserId(input);
    if (!id) return null;

    return Vaius.users.get(id)
        ?? Vaius.rest.users.get(id).catch(() => null);
}

export function resolveChannelId(input: string, guild?: Guild) {
    if (!input) return null;

    const match = input.match(idRegex);
    if (match)
        return match[0];

    if (guild)
        return guild.channels.find(c => c.name === input)?.id ?? null;

    return null;
}

export async function resolveChannel(input: string, guild?: Guild) {
    const id = resolveChannelId(input, guild);
    if (!id) return null;

    return Vaius.getChannel(id)
        ?? Vaius.rest.channels.get(id).catch(() => null);
}
