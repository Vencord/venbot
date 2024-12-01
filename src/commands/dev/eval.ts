import { readFileSync } from "fs";
import { AnyTextableChannel, Message, Uncached } from "oceanic.js";
import { join } from "path";

import { OwnerId } from "~/Client";
import { defineCommand } from "~/Commands";
import { ASSET_DIR } from "~/constants";
import { DISCORD_TOKEN } from "~/env";
import { silently } from "~/util/functions";
import { inspect } from "~/util/inspect";
import { countOccurrences, toCodeblock } from "~/util/text";

async function sendVoiceMessage(msg: Message<AnyTextableChannel | Uncached>) {
    const XSuperProperties = "eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1HQiIsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChYMTE7IExpbnV4IHg4Nl82NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMi4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTIyLjAuMC4wIiwib3NfdmVyc2lvbiI6IiIsInJlZmVycmVyIjoiaHR0cHM6Ly9hY2NvdW50cy5zcG90aWZ5LmNvbS8iLCJyZWZlcnJpbmdfZG9tYWluIjoiYWNjb3VudHMuc3BvdGlmeS5jb20iLCJyZWZlcnJlcl9jdXJyZW50IjoiIiwicmVmZXJyaW5nX2RvbWFpbl9jdXJyZW50IjoiIiwicmVsZWFzZV9jaGFubmVsIjoic3RhYmxlIiwiY2xpZW50X2J1aWxkX251bWJlciI6Mjg5Mzc5LCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsLCJkZXNpZ25faWQiOjB9";
    const waveform = "ASg6nDMzCVhSCRPRzr7AfPu3vrOfzMnMyfLEtqSH6L60sa/VpK5/3cvLu3L4tLmXhNCr0ITW2LS7ge3Q1ci8+ruun8u0s8SP+K+uloHIy8iW3szDuZHzwb62kf+0w6TGu8zMy/a+tpeR6LS8qcnGpqdt9cnLq4nwtLmEqcSnzHL1wMGvd/3I1rvd4Laujt2rt8SO9qyxgg==";
    const durationSecs = "15.14725";

    const bytes = readFileSync(join(ASSET_DIR, "eval-deez-nuts.mp3"));

    const body = {
        content: "",
        flags: 8192,
        message_reference: {
            message_id: msg.id,
            channel_id: msg.channelID,
            guild_id: msg.guildID
        },
        attachments: [{
            id: 0,
            filename: "voice-message.ogg",
            waveform,
            duration_secs: durationSecs
        }]
    };

    const formData = new FormData();
    formData.set("payload_json", JSON.stringify(body));
    formData.set("files[0]", new Blob([bytes]), "voice-message.ogg");

    await fetch(`https://discord.com/api/v10/channels/${msg.channelID}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bot ${DISCORD_TOKEN}`,
            "X-Super-Properties": XSuperProperties
        },
        body: formData
    });
}

defineCommand({
    name: "eval",
    description: "Evaluate javascript code",
    usage: "<code>",
    aliases: ["e", "$"],
    rawContent: true,
    async execute({ msg, reply }, code) {
        if (msg.author.id !== OwnerId) {
            silently(sendVoiceMessage(msg));

            return;
        }

        const console: any = {
            _lines: [] as string[],
            _log(...things: string[]) {
                this._lines.push(
                    ...things
                        .map(x => inspect(x, { getters: true }))
                        .join(" ")
                        .split("\n")
                );
            }
        };
        console.log = console.error = console.warn = console.info = console._log.bind(console);

        const { client, channel, author, content, guild, member } = msg;
        const fs = require("fs");
        const http = require("http");
        const https = require("https");
        const crypto = require("crypto");
        const net = require("net");
        const path = require("path");
        const util = require("util");
        const assert = require("assert");
        const os = require("os");
        const oceanic = require("oceanic.js");

        let script = code.replace(/(^`{3}(js|javascript)?|`{3}$)/g, "");
        if (script.includes("await")) script = `(async () => { ${script} })()`;

        try {
            var result = await eval(script);
        } catch (e: any) {
            var result = e;
        }

        let res = inspect(result, { getters: true });
        res = res.slice(0, 2000 - 10 - countOccurrences(res, "`"));

        let output = toCodeblock(res, "js");
        const consoleOutput = console._lines.join("\n").slice(0, Math.max(0, 1990 - output.length));

        if (consoleOutput) output += `\n${toCodeblock(consoleOutput)}`;

        return reply(output);
    }
});
