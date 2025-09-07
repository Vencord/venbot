declare module "__commands__" {
    const commandsMap: Record<string, () => void>;
    export default commandsMap;
}

declare module "__modules__" {
}

interface Response {
    json<T = any>(): Promise<T>;
}
