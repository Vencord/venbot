import CommandsMap from "__commands__";
import { AnyTextableChannel, AnyTextableGuildChannel, Message, PermissionName } from "oceanic.js";

import { Millis } from "./constants";
import { Deduper } from "./util/Deduper";

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
    rateLimits: Deduper<string>;
    category: string;
}

export const Commands = {} as Record<string, FullCommand>;

let currentCategory = "";

export function defineCommand<C extends Command<true>>(c: C & { guildOnly: true }): void;
export function defineCommand<C extends Command<false>>(c: C): void;
export function defineCommand<C extends Command<boolean>>(c: C): void {
    const cmd = c as any as FullCommand;
    cmd.rateLimits = new Deduper(10 * Millis.SECOND);
    cmd.category = currentCategory;

    Commands[cmd.name] = cmd;
    cmd.aliases?.forEach(alias => Commands[alias] = cmd);
}

for (const [category, load] of Object.entries(CommandsMap)) {
    currentCategory = category;
    load();
}

currentCategory = "";
