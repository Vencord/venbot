declare module "__commands__" {
    const commandsMap: Record<string, () => void>;
    export default commandsMap;
}

declare module "__modules__" {
}

declare module "__gitData__" {
    export const gitRemote: string;
    export const gitCommitHash: string;
}

interface Response {
    json<T = any>(): Promise<T>;
}
