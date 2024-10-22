export type Device = "web" | "mobile" | "bot";

export const enum IncomingOpcode {
    Error = -1,
    Message = 0,
    Login = 1,
    Heartbeat = 2,
    MessageHistory = 3,
}

export const enum OutgoingOpcode {
    Message = 0,
    Login = 1,
    Heartbeat = 2,
}

export const enum Role {
    Guest = 1 << 0,
    User = 1 << 1,
    Bot = 1 << 2,
    System = 1 << 3,
    Mod = 1 << 4,
    Admin = 1 << 5
}

export interface IncomingPayload {
    op: IncomingOpcode;
    d: any;
}

export interface OutgoingPayload {
    op: OutgoingOpcode;
    d: any;
}

export type AnyIncomingPayload = LoginResponse | Error | HeartbeatRequest | IncomingMessage;
export type AnyOutgoingPayload = Login | Message | Heartbeat;

export interface Login extends OutgoingPayload {
    op: OutgoingOpcode.Login;
    d: {
        anon: boolean;
        token: string;
        device: Device;
    }
}

export interface LoginResponse extends IncomingPayload {
    op: IncomingOpcode.Login;
    d: {
        id: string;
        username: string;
        roles: string;
    }
}

export interface Error extends IncomingPayload {
    op: IncomingOpcode.Error;
    d: string;
}

export interface HeartbeatRequest extends IncomingPayload {
    op: IncomingOpcode.Heartbeat;
    d: {};
}

export interface Heartbeat extends OutgoingPayload {
    op: OutgoingOpcode.Heartbeat;
    d: {};
}

export interface Message extends OutgoingPayload {
    op: OutgoingOpcode.Message;
    d: {
        content: string;
        bridgeMetadata?: {
            username: string;
            from: string;
            color?: string;
        }
    }
}

export interface IncomingMessage extends IncomingPayload {
    op: IncomingOpcode.Message;
    d: {
        userInfo: {
            username: string;
            roles: number;
            id: string;
            bridgeMetadata?: {
                from: string;
            }
        },
        timestamp: bigint;
        content: string;
        id: string;
        device: Device;
    }
}
