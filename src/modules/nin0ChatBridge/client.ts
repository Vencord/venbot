import { RawData, WebSocket } from "ws";

import { Vaius } from "~/Client";
import { NINA_CHAT_TOKEN } from "~/env";
import { getHighestRole } from "~/util";

import { AnyIncomingPayload, AnyOutgoingPayload, IncomingMessage, IncomingOpcode, OutgoingOpcode, Role } from "./types";

const NinaChatThreadId = "1295541912010362932";
const bridgeFrom = "venbot";

let socket: WebSocket;
let closeCount = 0;
const onOpenCallbacks = [] as Function[];

export function init() {
    if (!NINA_CHAT_TOKEN) {
        console.log("NINA_CHAT_TOKEN not set, skipping chat bridge");
        return;
    }

    closeCount++;
    if (closeCount >= 5) return;
    setTimeout(() => closeCount--, 5000);

    socket?.close();

    socket = new WebSocket("wss://chatws.nin0.dev/");
    socket.on("open", onOpen);
    socket.on("message", onMessage);
    socket.on("close", init);
}

function sendPayload(payload: AnyOutgoingPayload) {
    if (socket?.readyState !== WebSocket.OPEN) {
        onOpenCallbacks.push(() => sendPayload(payload));
        return;
    }

    socket.send(JSON.stringify(payload));
}

function sendMessage(content: string, username = "venbot bridge", color?: string) {
    sendPayload({
        op: OutgoingOpcode.Message,
        d: {
            content: content,
            bridgeMetadata: {
                username,
                color,
                from: bridgeFrom
            }
        }
    });
}

function onOpen() {
    console.info("Connected to nin0chat, sending Login payload");
    sendPayload({
        op: OutgoingOpcode.Login,
        d: {
            anon: false,
            device: "bot",
            token: NINA_CHAT_TOKEN!,
        }
    });
}

function onMessage(rawData: RawData) {
    const data: AnyIncomingPayload = JSON.parse(rawData.toString("utf-8"));

    switch (data.op) {
        case IncomingOpcode.Heartbeat:
            sendPayload({ op: OutgoingOpcode.Heartbeat, d: {} });
            break;
        case IncomingOpcode.Error:
            console.error("nin0chat error", data.d);
            break;
        case IncomingOpcode.Login:
            console.info("Connected to nin0chat as", data.d.username);
            break;
        case IncomingOpcode.Message:
            mirrorToDiscord(data);
            break;
        default:
            // console.warn("Unknown opcode", (data as any).op + ":", data);
            break;
    }
}

const hasFlag = (field: number, bit: number) => (field & bit) === bit;

function getRoleEmoji(roles: Role) {
    if (hasFlag(roles, Role.System)) return "🔧";
    if (hasFlag(roles, Role.Bot)) return "🤖";
    if (hasFlag(roles, Role.Admin)) return "👑";
    if (hasFlag(roles, Role.Mod)) return "🛡️";
    if (hasFlag(roles, Role.Guest)) return "🔰";
    if (hasFlag(roles, Role.User)) return "👤";
    return "";
}

function mirrorToDiscord(payload: IncomingMessage) {
    const { username, roles, bridgeMetadata } = payload.d.userInfo;

    if (hasFlag(roles, Role.Bot) && !hasFlag(roles, Role.Admin)) return;
    if (hasFlag(roles, Role.System) && !hasFlag(roles, Role.Admin)) return;
    if (bridgeMetadata?.from === bridgeFrom) return;

    const content = String(payload.d.content)
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", "\"")
        .replaceAll("&#039;", "'")
        .replaceAll("&amp;", "&");

    let emoji = getRoleEmoji(roles);
    emoji &&= "`" + emoji + "` ";

    const formattedName = hasFlag(roles, Role.System)
        ? ""
        : `<**${username}**>`;

    Vaius.rest.channels.createMessage(NinaChatThreadId, {
        content: `${emoji}${formattedName}   ${content}`
    });
}

Vaius.on("messageCreate", async msg => {
    if (msg.channelID !== NinaChatThreadId || msg.author.bot || !msg.member) return;

    let content = msg.content
        .replaceAll(/<@!?(\d+)>/g, (_, id) => `@${Vaius.users.get(id)?.tag ?? "unknown-user"}`)
        .replace(/<a?:(\w+):\d+>/g, ":$1:")
        .replace(/<#(\d+)>/g, (_, id) => `#${(Vaius.getChannel(id) as any)?.name ?? "unknown-channel"}`);

    if (msg.attachments.size) {
        content += "\n" + msg.attachments.map(a => `![${a.description || a.filename}](${a.proxyURL})`).join("\n");
    }

    const highestRole = getHighestRole(msg.member, r => r.color !== 0);
    const color = highestRole
        ? highestRole.color.toString(16).padStart(6, "0")
        : "0";

    sendMessage(content, msg.author.tag, color);
});
