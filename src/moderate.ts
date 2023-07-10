import { readdir, readFile } from "fs/promises";
import { Member, Message, MessageTypes } from "oceanic.js";
import { join } from "path";
import { fetch } from "undici";

import { Vaius } from "./Client";
import { DATA_DIR } from "./constants";
import { sendDm, silently, until } from "./util";

const mentions = /<@!?(\d{17,20})>/g;

// matches nothing
let imageHostRegex = /^(?!a)a/;

const annoyingDomainsDir = join(DATA_DIR, "annoying-domains");
readdir(annoyingDomainsDir).then(files =>
    Promise.all(files.filter(f => f !== "README.md").map(async s => {
        const content = await readFile(join(annoyingDomainsDir, s), "utf8");
        return content.trim().split("\n");
    }))
).then(domains => {
    const list = domains.flat().filter(Boolean).map(d => d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
    imageHostRegex = new RegExp(`https?://(\\w+\\.)?(${list.join("|")})`, "i");
    console.log(`Loaded ${list.length} image hosts`);
});

/**
 * Return type:
 * - void: no action should be taken
 * - empty string: delete silently
 * - string: delete and dm this message to the user
 */
const ChannelRules: Record<string, (m: Message) => string | void> = {
    "1028106818368589824"(m) {
        switch (m.type) {
            case MessageTypes.CHANNEL_PINNED_MESSAGE:
            case MessageTypes.THREAD_CREATED:
                return "";
        }
        if (m.content.includes("```css")) return;
        if (m.content.includes("https://")) return;
        if (m.attachments?.some(a => a.filename?.endsWith(".css"))) return;
        return "Please only post css snippets. To ask questions or discuss snippets, make a thread.";
    }
};

export async function moderateMessage(msg: Message) {
    if (!msg.inCachedGuildChannel()) return;
    if (!msg.channel.permissionsOf(Vaius.user.id).has("MANAGE_MESSAGES")) return;

    const warnText = ChannelRules[msg.channel.id]?.(msg);
    if (warnText !== void 0) {
        silently(msg.delete().then(() => !!warnText && sendDm(msg.author, { content: warnText })));
        return;
    }

    const allMentions = [...msg.content.matchAll(mentions)];

    const dupeCount = allMentions.reduce((acc, [, id]) => {
        acc[id] ??= 0;
        acc[id]++;
        return acc;
    }, {} as Record<string, number>);

    const dupeCounts = Object.values(dupeCount);
    if (dupeCounts.length > 10) {
        silently(msg.delete());
        silently(msg.member.edit({ communicationDisabledUntil: until(1000 * 60 * 60 * 5), reason: "mass ping" }));
        return;
    }

    if (Object.values(dupeCount).some(x => x > 3)) {
        silently(msg.delete());
        silently(msg.member.edit({ communicationDisabledUntil: until(1000 * 30), reason: "ping spam" }));
        return;
    }

    moderateImageHosts(msg);

    for (const [, a] of msg.attachments) {
        const content = await fetch(a.url, {
            headers: {
                Range: "bytes=0-13"
            }
        }).then(r => r.text());

        if (content === "-----BEGIN PGP") {
            silently(msg.delete());
            return;
        }
    }
}

export async function moderateNick(member: Member) {
    if (!member.guild.permissionsOf(Vaius.user.id).has("MANAGE_NICKNAMES")) return;

    const name = member.displayName;
    const normalizedName = name.normalize("NFKC");

    const isLame = normalizedName.startsWith("!");

    if (isLame || name !== normalizedName)
        silently(member.edit({
            nick: isLame ? "lame username (change it)" : normalizedName
        }));
}

export async function moderateImageHosts(msg: Message) {
    if (imageHostRegex.test(msg.content))
        silently(msg.delete().then(() =>
            sendDm(msg.author, {
                content: "cdn.discordapp.com is a free and great way to share images! (Please stop using stupid image hosts)"
            })
        ));
}
