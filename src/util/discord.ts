import { Client, CreateMessageOptions, Member, Message, PossiblyUncachedMessage, Role, User } from "oceanic.js";

import { Vaius } from "~/Client";

import Config from "~/config";
import { silently } from "./functions";

export const ID_REGEX = /^(?:<@!?)?(\d{17,20})>?$/;

export function reply(msg: Message, opts: CreateMessageOptions | string): Promise<Message>;
export function reply(msg: PossiblyUncachedMessage, opts: CreateMessageOptions | string, client: Client): Promise<Message>;
export function reply(msg: Message | PossiblyUncachedMessage, opts: CreateMessageOptions | string, client = (msg as any).client): Promise<Message> {
    if (typeof opts === "string")
        opts = {
            content: opts
        };

    return client.rest.channels.createMessage(msg.channelID, {
        ...opts,
        messageReference: {
            messageID: msg.id,
            channelID: msg.channelID,
            guildID: msg.guildID!
        }
    });
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
