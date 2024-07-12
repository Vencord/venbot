import { AnyTextableChannel, AnyTextableGuildChannel, Message, PermissionName } from "oceanic.js";

export interface Command<GuildOnly extends boolean = false> {
    name: string;
    aliases?: string[];
    description: string;
    usage: string | null;
    guildOnly?: GuildOnly;
    permissions?: Array<PermissionName>,
    ownerOnly?: boolean;
    modOnly?: boolean;
    execute(message: GuildOnly extends true ? Message<AnyTextableGuildChannel> : Message<AnyTextableChannel>, ...args: string[]): Promise<any> | void;
    rawContent?: boolean;
}

export interface FullCommand extends Command {
    rateLimits: Set<string>;
}

export const Commands = {} as Record<string, FullCommand>;

export function defineCommand<C extends Command<true>>(c: C & { guildOnly: true }): void;
export function defineCommand<C extends Command<false>>(c: C): void;
export function defineCommand<C extends Command<boolean>>(c: C): void {
    const cmd = c as any as FullCommand;
    cmd.rateLimits = new Set();

    Commands[cmd.name] = cmd;
    cmd.aliases?.forEach(alias => Commands[alias] = cmd);
}
