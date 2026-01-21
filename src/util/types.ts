export type Promiseable<T> = T | Promise<T>;

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P]; };

export type UserID = string;
export type GuildID = string;
export type ChannelID = string;
export type MessageID = string;
export type RoleID = string;
