import { Client, CreateMessageOptions, DiscordRESTError, Member, Message, MessageTypes, PossiblyUncachedMessage, Role, User } from "oceanic.js";

import { Vaius } from "~/Client";

import Config from "~/config";
import { silently } from "./functions";

export const ID_REGEX = /^(?:<@!?)?(\d{17,20})>?$/;
export const USER_MENTION_REGEX = /<@!?(\d{17,20})>/;

// search for REPLYABLE: in discord code
export const ReplyableMessageTypes = new Set<MessageTypes>([0, 7, 19, 20, 23, 24, 25, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 45, 46, 63] as MessageTypes[]);

export const canReplyToMessage = (msg: Message) => ReplyableMessageTypes.has(msg.type);

export async function reply(msg: Message, opts: CreateMessageOptions | string): Promise<Message>;
export async function reply(msg: PossiblyUncachedMessage, opts: CreateMessageOptions | string, client: Client): Promise<Message>;
export async function reply(msg: Message | PossiblyUncachedMessage, opts: CreateMessageOptions | string, client: Client = (msg as any).client): Promise<Message> {
    if (typeof opts === "string")
        opts = {
            content: opts
        };

    try {
        return await client.rest.channels.createMessage(msg.channelID, {
            ...opts,
            messageReference: {
                messageID: msg.id,
                channelID: msg.channelID,
                guildID: msg.guildID!
            }
        });
    } catch (err) {
        if (err instanceof DiscordRESTError && err.message.includes("Unknown message")) { // user deleted the original message before bot could reply
            return client.rest.channels.createMessage(msg.channelID, opts);
        }

        throw err;
    }

}

export function getHighestRole({ guild, roles }: Member, filter?: (r: Role) => boolean) {
    if (!roles.length) return null;

    let resolvedRoles = roles.map(r => guild.roles.get(r)!);

    if (filter) resolvedRoles = resolvedRoles.filter(filter);

    return resolvedRoles.reduce((a, b) => a.position > b.position ? a : b);
}

export const getHomeGuild = () => Vaius.guilds.get(Config.homeGuildId);

export async function getAsMemberInHomeGuild(userId: string) {
    const guild = getHomeGuild();
    if (!guild) return null;

    return guild.members.get(userId) ?? guild.getMember(userId).catch(() => null);
}

export async function sendDm(user: User, data: CreateMessageOptions) {
    const dm = await silently(user.createDM());
    if (!dm) return false;

    return dm.createMessage(data)
        .catch(() => false as const);
}

export function formatEmoji(emoji: { id: string; name: string; animated: boolean; }) {
    return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}
