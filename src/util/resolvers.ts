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
    if (id)
        return Vaius.users.get(id)
            ?? Vaius.rest.users.get(id)
                .catch(() => null);

    return null;
}
