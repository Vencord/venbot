import { readdir, readFile } from "fs/promises";
import { AnyTextableGuildChannel, AutoModerationActionTypes, EmbedOptions, Member, Message, MessageTypes } from "oceanic.js";
import { join } from "path";

import { Vaius } from "../Client";
import { DATA_DIR, MINUTES_IN_MS, MOD_LOG_CHANNEL_ID } from "../constants";
import { reply, sendDm, silently, until } from "../util";

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
        if (m.content.includes("```")) return;
        if (m.content.includes("https://")) return;
        if (m.attachments?.some(a => a.filename?.endsWith(".css"))) return;
        return "Please only post css snippets. They must be enclosed in a proper codeblock. To ask questions or discuss snippets, make a thread.";
    }
};

export function logModerationAction(content: string, ...embeds: EmbedOptions[]) {
    Vaius.rest.channels.createMessage(MOD_LOG_CHANNEL_ID, {
        content,
        embeds
    });
}

function makeEmbedForMessage(message: Message): EmbedOptions {
    return {
        author: {
            name: message.author.tag,
            iconURL: message.author.avatarURL()
        },
        description: message.content
    };
}


export async function moderateMessage(msg: Message) {
    if (!msg.inCachedGuildChannel()) return;
    if (!msg.channel.permissionsOf(Vaius.user.id).has("MANAGE_MESSAGES")) return;

    const warnText = ChannelRules[msg.channel.id]?.(msg);
    if (warnText !== void 0) {
        silently(msg.delete().then(() => !!warnText && sendDm(msg.author, { content: warnText })));
        return;
    }

    if (msg.member.permissions.has("MANAGE_MESSAGES")) return;

    for (const mod of [moderateInvites, moderateImageHosts]) {
        if (await mod(msg)) return;
    }
}

const HoistCharactersRegex = /^[!"#$%'+,.*-]+/;

export async function moderateNick(member: Member) {
    if (member.bot || !member.guild.permissionsOf(Vaius.user.id).has("MANAGE_NICKNAMES")) return;

    const name = member.displayName;
    const normalizedName = name.normalize("NFKC").replace(HoistCharactersRegex, "");

    if (name !== normalizedName)
        silently(member.edit({
            nick: normalizedName || member.username.replace(HoistCharactersRegex, "")
        }));
}

export async function moderateImageHosts(msg: Message) {
    if (!imageHostRegex.test(msg.content))
        return false;

    return silently(msg.delete().then(() =>
        sendDm(msg.author, {
            content: "cdn.discordapp.com is a free and great way to share images! (Please stop using stupid image hosts)"
        })
    ));
}

const inviteRe = /discord(?:(?:app)?\.com\/invite|\.gg)\/([a-z0-9-]+)/ig;
const allowedGuilds = new Set([
    "1015060230222131221", // vencord
    "811255666990907402", // aliucord
    "1015931589865246730", // vendetta
    "86004744966914048", // betterdiscord
    "538759280057122817", // powercord
    "950850315601711176", // enmity
    "920674107111137340", // stupidity archive
    "820732039253852171", // armcord
    "458997239738793984", // strencher
    "917308687423533086", // manti (reviewdb)
    "613425648685547541", // ddevs
    "891039687785996328", // kernel
    "244230771232079873", // progamers hangout
    "1096357702931841148", // decor
    "449175561529589761", // blackbox (userbg)
    "1196075698301968455", // pyoncord
    "1154257010532032512", // moonlight
    "1009882479886344294", // poke
    "961691461554950145", // hyprland
    "1097993424931672216", // aero
    "1116074561734197270", // dziurwa insane
    "820745488231301210", // ntts
]);

export async function moderateInvites(msg: Message) {
    for (const [, code] of msg.content.matchAll(inviteRe)) {
        const inviteData = await Vaius.rest.channels.getInvite(code, {}).catch(() => null);
        if (!inviteData?.guildID || !inviteData.guild) continue;

        if (!allowedGuilds.has(inviteData.guildID)) {
            silently(msg.delete());
            silently(msg.member!.edit({ communicationDisabledUntil: until(5 * MINUTES_IN_MS), reason: "invite" }));
            logModerationAction(
                `${msg.author.mention} posted an invite to ${inviteData.guild.name} in ${msg.channel!.mention}`,
                makeEmbedForMessage(msg)
            );
            return true;
        }
    }

    return false;
}

export function initModListeners() {
    Vaius.on("guildMemberUpdate", moderateNick);
    Vaius.on("guildMemberAdd", moderateNick);

    Vaius.on("autoModerationActionExecution", async (guild, _channel, user, data) => {
        if (data.action.type !== AutoModerationActionTypes.SEND_ALERT_MESSAGE) return;

        const includesPing = data.content.includes("@everyone") || data.content.includes("@here");
        const includesInvite = data.content.includes("discord.gg/") || data.content.includes("discord.com/invite");

        if (includesPing && includesInvite) {
            await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: "tried to ping everyone with an invite (spam bot)",
                deleteMessageDays: 1
            });

            logModerationAction(`Banned <@${user.id}> for trying to ping everyone with an invite.`);
        }
    });

}

const TESSIE_ID = "1081940449717133374";
export async function lobotomiseMaybe(msg: Message<AnyTextableGuildChannel>) {
    if (msg.author.id !== TESSIE_ID || !msg.referencedMessage || msg.content !== "mods crush this person's skull") return false;

    try {
        await msg.referencedMessage.member!.edit({
            communicationDisabledUntil: until(10 * MINUTES_IN_MS),
            reason: "showing screenshot of automodded message"
        });

        silently(reply(msg, {
            content: "Lobotomised! 🔨"
        }));

        return true;
    } catch (e) {
        console.error("Failed to lobotomise", e);
        return false;
    }
}
