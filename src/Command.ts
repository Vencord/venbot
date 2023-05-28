import { Message } from "oceanic.js";

export interface Command {
    name: string;
    aliases?: string[];
    ownerOnly?: boolean;
    execute(message: Message, ...args: string[]): Promise<any>;
    rawContent?: boolean;
}

export const Commands = {} as Record<string, Command>;

export function defineCommand<C extends Command>(cmd: C) {
    Commands[cmd.name] = cmd;
    cmd.aliases?.forEach(alias => Commands[alias] = cmd);
}
