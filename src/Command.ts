import { Message } from "oceanic.js";

export interface Command {
    name: string;
    aliases?: string[];
    ownerOnly?: boolean;
    execute(message: Message, ...args: string[]): Promise<any>;
    rawContent?: boolean;
}

export interface FullCommand extends Command {
    rateLimits: Set<string>;
}

export const Commands = {} as Record<string, FullCommand>;

export function defineCommand<C extends Command>(c: C) {
    const cmd = c as any as FullCommand;
    cmd.rateLimits = new Set();

    Commands[cmd.name] = cmd;
    cmd.aliases?.forEach(alias => Commands[alias] = cmd);
}
