import CommandsMap from "__commands__";
import { AnyTextableChannel, AnyTextableGuildChannel, CreateMessageOptions, DiscordRESTError, EditMessageOptions, Message, PermissionName } from "oceanic.js";

import { Millis } from "~/constants";
import { Deduper } from "~/util/Deduper";
import { silently } from "~/util/functions";
import { TTLMap } from "~/util/TTLMap";


const PreviousCommandResponses = new TTLMap<string, string>(10 * Millis.MINUTE);

type CommandReplyOptions = CreateMessageOptions & EditMessageOptions;

export class CommandContext<GuildOnly extends boolean = false> {
    private responseId?: string;

    constructor(
        readonly msg: GuildOnly extends true ? Message<AnyTextableGuildChannel> : Message<AnyTextableChannel>,
        readonly prefix: string,
        readonly commandName: string,
    ) {
        this.responseId = PreviousCommandResponses.get(msg.id);
    }

    private _normalizeOptions(opts: string | CommandReplyOptions): CommandReplyOptions {
        if (typeof opts === "string")
            opts = { content: opts };

        // use empty values so if the edit has less fields than the original message, it doesn't keep the old values
        opts = {
            embeds: [],
            files: [],
            attachments: [],
            content: "",
            components: [],
            stickerIDs: [],
            ...opts,
        };

        return opts;
    }

    private async _createMessage(opts: CreateMessageOptions) {
        const { msg } = this;

        const response = await msg.client.rest.channels.createMessage(msg.channelID, opts);

        PreviousCommandResponses.set(msg.id, response.id);
    }

    createMessage = async (opts: string | CommandReplyOptions) => {
        opts = this._normalizeOptions(opts);

        const { responseId, msg } = this;

        if (!responseId)
            return this._createMessage(opts);

        try {
            // oceanic's editMessage function mutates your input options, so freeze it to prevent that
            // FIXME: remove this spread when oceanic fixes this awful design

            return await msg.client.rest.channels.editMessage(msg.channelID, responseId, { ...opts });
        } catch (e) {
            if (!(e instanceof DiscordRESTError) || e.status !== 404)
                throw e;

            this.responseId = undefined;
            return this._createMessage(opts);
        }
    };

    reply = async (opts: string | EditMessageOptions & CreateMessageOptions) => {
        opts = this._normalizeOptions(opts);

        return this.createMessage({
            ...opts,
            messageReference: {
                messageID: this.msg.id,
                channelID: this.msg.channelID,
                guildID: this.msg.guildID!
            }
        });
    };

    react = async (emoji: string) => {
        await silently(this.msg.createReaction(emoji));
    };
}

export interface Command<GuildOnly extends boolean = false> {
    name: string;
    aliases?: string[];
    description: string;
    usage: string | null;
    guildOnly?: GuildOnly;
    permissions?: Array<PermissionName>,
    ownerOnly?: boolean;
    modOnly?: boolean;
    rawContent?: boolean;
    execute(context: CommandContext<GuildOnly>, ...args: string[]): Promise<any> | void;
}

export interface FullCommand extends Command {
    rateLimits: Deduper<string>;
    category: string;
}

export const Commands: Record<string, FullCommand> = Object.create(null);

let currentCategory = "";

function addCommand(name: string, cmd: FullCommand) {
    if (Commands[name])
        throw new Error(`Command ${name} already exists`);

    Commands[name] = cmd;
}

export function defineCommand<C extends Command<true>>(c: C & { guildOnly: true }): void;
export function defineCommand<C extends Command<false>>(c: C): void;
export function defineCommand<C extends Command<boolean>>(c: C): void {
    const cmd = c as any as FullCommand;
    cmd.rateLimits = new Deduper(10 * Millis.SECOND);
    cmd.category = currentCategory;

    addCommand(cmd.name, cmd);
    cmd.aliases?.forEach(alias => addCommand(alias, cmd));
}

for (const [category, load] of Object.entries(CommandsMap)) {
    currentCategory = category;
    load();
}

currentCategory = "";
