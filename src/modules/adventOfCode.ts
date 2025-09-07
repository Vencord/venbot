import { readFile } from "fs/promises";
import { CreateMessageOptions, Message, TextChannel } from "oceanic.js";

import { Vaius } from "~/Client";
import Config from "~/config";
import { formatTable, toCodeblock } from "~/util/text";

interface Leaderboard {
    members: Record<string, {
        id: number,
        name: string,
        stars: number,
        global_score: number,
        local_score: number;
        last_star_ts: number;
    }>;
}

let lastMessage: Message;

async function fetchLeaderboard() {
    const data = process.env.NODE_ENV === "production"
        ? await fetch(Config.adventOfCode.leaderboardUrl + ".json", {
            method: "GET",
            headers: new Headers({
                cookie: Config.adventOfCode.cookie!,
                "User-Agent": "Venbot Discord Bot (https://github.com/Vencord/venbot) <vendicated+aoc@riseup.net>",
                "Accept": "application/json"
            })
        }).then(res => {
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return res.json() as Promise<Leaderboard>;
        })
        : await readFile("./data.json", "utf8").then(JSON.parse) as Leaderboard;

    return Object.values(data.members)
        .sort((a, b) =>
            (b.stars - a.stars) || (b.local_score - a.local_score) || (b.global_score - a.global_score)
        );
}

async function postMessage() {
    const leaderboard = await fetchLeaderboard();

    const [lastStarTs, lastStarUser] = leaderboard.reduce<[number, string]>(
        ([lastTs, lastUser], u) => [Math.max(lastTs, u.last_star_ts), u.last_star_ts > lastTs ? u.name : lastUser],
        [0, "Noone"]
    );

    const digits = Math.floor(Math.log10(leaderboard[0].stars) + 1);

    const rows = leaderboard
        .filter(u => u.local_score > 0)
        .map((u, i) => [
            `${i + 1})`,
            `${u.stars.toString().padStart(digits, " ")}⭐`,
            u.name || "Anon",
            `(${u.local_score}P)`
        ]);


    const content =
        `Last Submission: <t:${lastStarTs}> by ${lastStarUser}\n`
        + `Last Updated: <t:${Math.floor(Date.now() / 1000)}>\n`
        + toCodeblock(formatTable(rows));

    const options = {
        embeds: [{
            author: {
                name: "Advent of Code Leaderboard",
                iconURL: "https://adventofcode.com/favicon.png",
                url: Config.adventOfCode.leaderboardUrl
            },
            description: content
        }]
    } satisfies CreateMessageOptions;

    if (!lastMessage) {
        lastMessage = await (Vaius.getChannel(Config.adventOfCode.channelId) as TextChannel).createMessage(options);
        return;
    }

    if (lastMessage.embeds[0].description !== content)
        lastMessage = await lastMessage.edit(options);
}

if (Config.adventOfCode.enabled) {
    Vaius.once("ready", async () => {
        const chan = Vaius.getChannel(Config.adventOfCode.channelId) as TextChannel;
        const messages = await chan.getMessages({ limit: 1 });
        lastMessage = messages[0];

        postMessage();
        setInterval(postMessage, 1000 * 60 * 15);
    });
}
