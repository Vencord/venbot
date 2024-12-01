import { readFile } from "fs/promises";
import { CreateMessageOptions, Message, TextChannel } from "oceanic.js";

import { Vaius } from "~/Client";
import { ADVENT_OF_CODE_CHANNEL_ID, ADVENT_OF_CODE_COOKIE } from "~/env";
import { codeblock, formatTable } from "~/util";

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

const LEADERBOARD_URL = "https://adventofcode.com/2024/leaderboard/private/view/1776680";

let lastMessage: Message;

async function fetchLeaderboard() {
    const data = process.env.NODE_ENV === "production"
        ? await fetch(LEADERBOARD_URL + ".json", {
            method: "GET",
            headers: new Headers({
                cookie: ADVENT_OF_CODE_COOKIE!,
                "User-Agent": "Venbot Discord Bot (https://codeberg.org/vee/bot) <vendicated+aoc@riseup.net>",
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
        + codeblock(formatTable(rows));

    const options = {
        embeds: [{
            author: {
                name: "Advent of Code Leaderboard",
                iconURL: "https://adventofcode.com/favicon.png",
                url: LEADERBOARD_URL
            },
            description: content
        }]
    } satisfies CreateMessageOptions;

    if (!lastMessage) {
        lastMessage = await (Vaius.getChannel(ADVENT_OF_CODE_CHANNEL_ID!) as TextChannel).createMessage(options);
        return;
    }

    if (lastMessage.content !== content)
        lastMessage = await lastMessage.edit(options);
}

if (ADVENT_OF_CODE_CHANNEL_ID && ADVENT_OF_CODE_COOKIE) {
    Vaius.once("ready", async () => {
        const chan = Vaius.getChannel(ADVENT_OF_CODE_CHANNEL_ID!) as TextChannel;
        const messages = await chan.getMessages({ limit: 1 });
        lastMessage = messages[0];

        postMessage();
        setInterval(postMessage, 1000 * 60 * 15);
    });
}
