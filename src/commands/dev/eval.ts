
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { AnsiBackgroundColor, ansiFormatText, AnsiTextColor } from "~/util/ansiFormat";
import { inspect } from "~/util/inspect";
import { countOccurrences, toCodeblock } from "~/util/text";

function makeFakeConsole() {
    const lines = [] as string[];
    const makeLog = (color?: AnsiBackgroundColor | AnsiTextColor) => (...things: string[]) => {
        lines.push(
            ...things
                .map(x => inspect(x, { getters: true }))
                .join(" ")
                .split("\n")
                .map(line => color ? ansiFormatText(line, color) : line)
        );
    };

    return {
        _lines: lines,
        log: makeLog(),
        info: makeLog(AnsiTextColor.Cyan),
        warn: makeLog(AnsiTextColor.Yellow),
        error: makeLog(AnsiTextColor.Red),
        debug: makeLog(AnsiTextColor.Gray),
    };
}

const toRedact = [
    Config.token,
    Config.adventOfCode.cookie,
    Config.githubLinking.clientSecret,
    Config.githubLinking.pat,
    Config.reporter.pat,
    Config.reporter.webhookSecret
];

function redactCredentials(str: string) {
    for (const secret of toRedact) {
        if (secret) {
            str = str.replaceAll(secret, "[REDACTED]");
        }
    }

    return str;
}

defineCommand({
    name: "eval",
    description: "Evaluate javascript code",
    usage: "<code>",
    aliases: ["e", "$"],
    rawContent: true,
    ownerOnly: true,
    async execute(ctx, code) {
        const console = makeFakeConsole();

        const { msg, reply, commandName, createMessage, prefix, react } = ctx;
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

        if (typeof result === "function") result = result.toString();

        let res = redactCredentials(inspect(result, { getters: true }));
        res = res.slice(0, 2000 - 10 - countOccurrences(res, "`"));

        let output = toCodeblock(res, "js");
        const consoleOutput = redactCredentials(console._lines.join("\n")).slice(0, Math.max(0, 1990 - output.length));

        if (consoleOutput) output += `\n${toCodeblock(consoleOutput, "ansi")}`;

        return reply(output);
    }
});
