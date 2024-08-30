declare module "__commands__" {
    const commandsMap: Record<string, () => void>;
    export default commandsMap;
}
