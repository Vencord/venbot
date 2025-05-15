
import { defineCommand } from "~/Commands";
import { inspect } from "~/util/inspect";
import { countOccurrences, toCodeblock } from "~/util/text";

defineCommand({
    name: "eval",
    description: "Evaluate javascript code",
    usage: "<code>",
    aliases: ["e", "$"],
    rawContent: true,
    ownerOnly: true,
    async execute({ msg, reply, commandName }, code) {
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
