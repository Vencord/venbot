import { AnyInteractionChannel, AnyInteractionGateway, AnyTextableGuildChannel, AutocompleteInteraction, CommandInteraction, ComponentInteraction, ComponentTypes, InteractionTypes, MessageFlags, ModalSubmitInteraction, SelectMenuTypes } from "oceanic.js";

import { handleError } from ".";
import { OwnerId, Vaius } from "./Client";
import Config from "./config";

interface BaseInteractionHandler {
    ownerOnly?: boolean;
    guildOnly?: boolean;
    modOnly?: boolean;
}
interface AnyInteractionHandler extends BaseInteractionHandler {
    handle(interaction: AnyInteractionGateway): any;
}

type CommandHandler = {
    guildOnly?: false;
    handle(interaction: CommandInteraction): any;
} | {
    guildOnly: true;
    handle(interaction: CommandInteraction<AnyTextableGuildChannel>): any;
};

export type CommandInteractionHandler = BaseInteractionHandler & CommandHandler & {
    name: string;
    ownerOnly?: boolean;
};

type ComponentHandler = {
    guildOnly?: false;
    handle(interaction: ComponentInteraction): any;
} | {
    guildOnly: true;
    handle(interaction: ComponentInteraction<ComponentTypes.BUTTON | SelectMenuTypes, AnyTextableGuildChannel>): any;
};

export type ComponentInteractionHandler = BaseInteractionHandler & ComponentHandler & {
    customID: string;
    ownerOnly?: boolean;
};

export interface InteractionTypeMap<GuildOnly extends Boolean> {
    [InteractionTypes.APPLICATION_COMMAND]: CommandInteraction<GuildOnly extends true ? AnyTextableGuildChannel : AnyInteractionChannel>;
    [InteractionTypes.MESSAGE_COMPONENT]: ComponentInteraction<ComponentTypes.BUTTON | SelectMenuTypes, GuildOnly extends true ? AnyTextableGuildChannel : AnyInteractionChannel>;
    [InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE]: AutocompleteInteraction<GuildOnly extends true ? AnyTextableGuildChannel : AnyInteractionChannel>;
    [InteractionTypes.MODAL_SUBMIT]: ModalSubmitInteraction<GuildOnly extends true ? AnyTextableGuildChannel : AnyInteractionChannel>;
    [InteractionTypes.PING]: never;
}

export type CustomHandler<T extends AnyInteractionGateway> = {
    isMatch(interaction: T): boolean;
    handle(interaction: T): any;
};

type AnyCustomHandler = CustomHandler<AnyInteractionGateway>;

const CustomHandlers = {} as Partial<Record<InteractionTypes, AnyCustomHandler[]>>;
const CommandHandlers = {} as Record<string, CommandInteractionHandler>;
const ComponentHandlers = {} as Record<string, ComponentInteractionHandler>;

export function handleCommandInteraction(handler: CommandInteractionHandler) {
    CommandHandlers[handler.name] = handler;
}

export function handleComponentInteraction(handler: ComponentInteractionHandler) {
    ComponentHandlers[handler.customID] = handler;
}

export function handleInteraction<T extends InteractionTypes, GuildOnly extends boolean>(handler: { type: T, guildOnly?: GuildOnly; } & CustomHandler<InteractionTypeMap<GuildOnly>[T]>) {
    CustomHandlers[handler.type] ??= [];
    CustomHandlers[handler.type]!.push(handler);
}

function resolveHandler(interaction: AnyInteractionGateway): AnyInteractionHandler | undefined {
    return (
        (interaction.type === InteractionTypes.APPLICATION_COMMAND && CommandHandlers[interaction.data.name]) ||
        (interaction.type === InteractionTypes.MESSAGE_COMPONENT && ComponentHandlers[interaction.data.customID]) ||
        CustomHandlers[interaction.type]?.find(handler => handler.isMatch(interaction as any))
    );
}

Vaius.on("interactionCreate", async interaction => {
    const handler = resolveHandler(interaction);
    if (!handler) return;
    if (handler.ownerOnly && interaction.user.id !== OwnerId) return;
    if (handler.guildOnly && !interaction.inCachedGuildChannel()) return;
    if (handler.modOnly) {
        if (!interaction.inCachedGuildChannel()) return;

        if (!interaction.member.roles.includes(Config.roles.mod))
            return;
    }

    try {
        await handler.handle(interaction);
    } catch (e) {
        handleError("Error handling interaction", e);

        if (interaction.type === InteractionTypes.APPLICATION_COMMAND) {
            const message = `An error occurred: ${e}`;

            if (interaction.acknowledged) {
                await interaction.createFollowup({
                    content: message,
                    flags: MessageFlags.EPHEMERAL
                });
            } else {
                await interaction.createMessage({
                    content: message,
                    flags: MessageFlags.EPHEMERAL
                });
            }
        }
    }
});
