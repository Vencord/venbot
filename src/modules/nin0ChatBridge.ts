import { RawData, WebSocket } from "ws";

import { Vaius } from "~/Client";
import { NINA_CHAT_KEY } from "~/env";

const enum Role {
    Admin = 2,
    Discord = 3,
    Bot = 12,
}

const Emojis = {
    [Role.Admin]: "👑",
    [Role.Bot]: "🔧",
};

const NinaChatThreadId = "1295541912010362932";

let socket: WebSocket;
let closeCount = 0;

function init() {
    if (!NINA_CHAT_KEY) {
        console.log("NINA_CHAT_KEY not set, skipping chat bridge");
        return;
    }

    closeCount++;
    if (closeCount >= 5) return;
    setTimeout(() => closeCount--, 5000);

    socket?.close();

    socket = new WebSocket("wss://guhws.nin0.dev/");
    socket.on("open", onOpen);
    socket.on("message", onMessage);
    socket.on("close", init);
}

function sendMessage(content: string, username = "venbot bridge") {
    socket.send(JSON.stringify({ username, content, key: NINA_CHAT_KEY }));
}

function onOpen() {
    console.log("Connected to nina chat");
    // sendMessage("Connected");
}

function onMessage(rawData: RawData) {
    const data = JSON.parse(String(rawData));
    if (!data.content) return;

    if (data.role === Role.Discord) return;

    const content = String(data.content)
        .replaceAll("[img]", "")
        .replaceAll("[/img]", "")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", "\"")
        .replaceAll("&#039;", "'")
        .replaceAll("&amp;", "&");

    let emoji = Emojis[data.role] || "";
    emoji &&= "`" + emoji + "` ";

    Vaius.rest.channels.createMessage(NinaChatThreadId, {
        content: `${emoji}<**${data.username}**>   ${content}`
    });
}

Vaius.on("messageCreate", msg => {
    if (msg.channelID !== NinaChatThreadId || msg.author.bot) return;

    let content = msg.content
        .replaceAll(/<@!?(\d+)>/g, (_, id) => `@${Vaius.users.get(id)?.tag ?? "unknown-user"}`)
        .replace(/<a?:(\w+):\d+>/g, ":$1:")
        .replace(/<#(\d+)>/g, (_, id) => `#${(Vaius.getChannel(id) as any)?.name ?? "unknown-channel"}`);

    if (msg.attachments.size) {
        content += "\n" + msg.attachments.map(a => `[img]${a.proxyURL.replace("https://", "http://")}[/img]`).join("\n");
    }

    sendMessage(content, msg.author.tag);
});

init();
