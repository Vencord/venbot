import { ApplicationCommandOptionsAttachment, ApplicationCommandOptionsBoolean, ApplicationCommandOptionsInteger, ApplicationCommandOptionsString, ApplicationCommandOptionsUser, ApplicationCommandOptionsWithValue, ApplicationCommandOptionTypes } from "oceanic.js";
import { SetOptional } from "type-fest";

function makeOption<T extends ApplicationCommandOptionsWithValue>(type: ApplicationCommandOptionTypes) {
    return (options: Omit<SetOptional<T, "description">, "type">) => ({
        type,
        ...options,
        description: options.description || "No description provided."
    }) as any as T;
}

export const CommandStringOption = makeOption<ApplicationCommandOptionsString>(ApplicationCommandOptionTypes.STRING);
export const CommandUserOption = makeOption<ApplicationCommandOptionsUser>(ApplicationCommandOptionTypes.USER);
export const CommandIntegerOption = makeOption<ApplicationCommandOptionsInteger>(ApplicationCommandOptionTypes.INTEGER);
export const CommandAttachmentOption = makeOption<ApplicationCommandOptionsAttachment>(ApplicationCommandOptionTypes.ATTACHMENT);
export const CommandBooleanOption = makeOption<ApplicationCommandOptionsBoolean>(ApplicationCommandOptionTypes.BOOLEAN);
