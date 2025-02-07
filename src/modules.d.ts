declare module "__commands__" {
    const commandsMap: Record<string, () => void>;
    export default commandsMap;
}

interface Response {
    json<T = any>(): Promise<T>;
}
