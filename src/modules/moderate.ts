import { spawn } from "child_process";
import { readdir, readFile } from "fs/promises";
import { AnyTextableGuildChannel, AutoModerationActionTypes, EmbedOptions, Member, Message, MessageTypes } from "oceanic.js";
import { join } from "path";

import { reply, sendDm } from "~/util/discord";
import { silently } from "~/util/functions";
import { until } from "~/util/time";

import Config from "~/config";
import { isTruthy } from "~/util/guards";
import { logAutoModAction } from "~/util/logAction";
import { handleError } from "..";
import { Vaius } from "../Client";
import { ASSET_DIR, Millis } from "../constants";

// matches nothing
let imageHostRegex = /^(?!a)a/;

const annoyingDomainsDir = join(ASSET_DIR, "annoying-domains");
readdir(annoyingDomainsDir)
    .then(files =>
        Promise.all(
            files
                .filter(f => f !== "README.md")
                .map(async s => {
                    const content = await readFile(join(annoyingDomainsDir, s), "utf8");
                    return content.trim().split("\n");
                }))
    ).then(domains => {
        const list = domains
            .flat()
            .filter(Boolean)
            .map(d => d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));

        imageHostRegex = new RegExp(`https?://(\\w+\\.)?(${list.join("|")})`, "i");

        console.log(`Loaded ${list.length} image hosts`);
    });

const makeSnippetChannelRules = (language?: string) => (m: Message) => {
    switch (m.type) {
        case MessageTypes.CHANNEL_PINNED_MESSAGE:
        case MessageTypes.THREAD_CREATED:
            return "";
    }

    if (!language) return;

    if (m.content.includes("```")) return;
    if (m.content.includes("https://")) return;
    if (m.attachments?.some(a => a.filename?.endsWith(`.${language}`))) return;

    return `Please only post ${language} snippets. They must be enclosed in a proper codeblock. To ask questions or discuss snippets, make a thread.`;
};

/**
 * Return type:
 * - void: no action should be taken
 * - empty string: delete silently
 * - string: delete and dm this message to the user
 */
const ChannelRules: Record<string, (m: Message) => string | void> = {
    "1028106818368589824": makeSnippetChannelRules("css"),
    "1028106792737185842": makeSnippetChannelRules("js"),
    "1102784112584040479": makeSnippetChannelRules(),
};

function makeEmbedForMessage(message: Message): EmbedOptions {
    return {
        author: {
            name: message.author.tag,
            iconURL: message.author.avatarURL()
        },
        description: message.content
    };
}

const channelsMessagedUserMap = new Map<string, Set<string>>();

async function moderateMultiChannelSpam(msg: Message<AnyTextableGuildChannel>) {
    let channelsMessaged = channelsMessagedUserMap.get(msg.author.id);
    if (!channelsMessaged) {
        channelsMessaged = new Set();
        channelsMessagedUserMap.set(msg.author.id, channelsMessaged);
    }

    channelsMessaged.add(msg.channelID);
    setTimeout(() => {
        const channelsMessaged = channelsMessagedUserMap.get(msg.author.id);
        if (channelsMessaged) {
            channelsMessaged.delete(msg.channelID);
            if (!channelsMessaged.size)
                channelsMessagedUserMap.delete(msg.author.id);
        }
    }, 15 * Millis.SECOND);

    if (channelsMessaged.size < 3) return false;

    await msg.member.edit({
        communicationDisabledUntil: until(1 * Millis.HOUR),
        reason: "Messaged >=3 different channels within 15 seconds"
    });

    logAutoModAction({
        content: `Muted <@${msg.author.id}> for messaging >=3 different channels within 15 seconds`,
        embeds: [makeEmbedForMessage(msg)]
    });

    await silently(msg.delete());

    return true;
}

export async function moderateMessage(msg: Message, isEdit: boolean) {
    if (!msg.inCachedGuildChannel()) return;
    if (!msg.channel.permissionsOf(Vaius.user.id).has("MANAGE_MESSAGES")) return;

    // FIXME: make this less bad
    if (msg.messageSnapshots?.length)
        msg.content = msg.messageSnapshots[0].message?.content || msg.content;

    const warnText = ChannelRules[msg.channel.id]?.(msg);
    if (warnText !== void 0) {
        silently(msg.delete().then(() => !!warnText && sendDm(msg.author, { content: warnText })));
        return;
    }

    if (msg.member?.permissions.has("MANAGE_MESSAGES")) return;

    const moderationFunctions = [
        !isEdit && moderateMultiChannelSpam,
        moderateInvites,
        moderateImageHosts,
        moderateSuspiciousFiles
    ].filter(isTruthy);

    for (const moderate of moderationFunctions) {
        if (await moderate(msg)) return;
    }
}

const HoistCharactersRegex = /^[!"#$%'+,.*-]+/;

export async function moderateNick(member: Member) {
    if (member.bot || !member.guild.permissionsOf(Vaius.user.id).has("MANAGE_NICKNAMES")) return;

    const name = member.displayName;
    const normalizedName = name
        .normalize("NFKC")
        .replace(HoistCharactersRegex, "")
        .replace(/[\u0300-\u036f\u0489]/g, "") // diacritics
        .replace(/[\u20df\u3099-\u309C]/g, "") // renders as a space and can be used for "empty" usernames
        .replaceAll("﷽", "")
        .trim()
        || member.username.replace(HoistCharactersRegex, "").trim()
        || "lame username";

    if (name !== normalizedName)
        silently(member.edit({ nick: normalizedName }));
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
    Config.homeGuildId,
    ...Config.moderation.inviteAllowedGuilds
]);

async function getInviteImage(code: string) {
    const res = await fetch(`https://invidget.switchblade.xyz/${code}`);
    if (!res.ok) return null;

    const svgText = await res.text()
        .then(text => text.replace("image/jpg", "image/jpeg")); // https://github.com/SwitchbladeBot/invidget/pull/82

    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        const proc = spawn("rsvg-convert", ["-z", "2"]);

        proc.stdout.on("data", chunk => chunks.push(chunk));
        proc.on("close", code =>
            code === 0
                ? resolve(Buffer.concat(chunks))
                : reject(new Error(`rsvg-convert exited with code ${code}`))
        );
        proc.on("error", reject);

        proc.stdin.write(svgText);
        proc.stdin.end();
    });
}

export async function moderateInvites(msg: Message) {
    for (const [, code] of msg.content.matchAll(inviteRe)) {
        const inviteData = await Vaius.rest.channels.getInvite(code, {}).catch(() => null);
        if (!inviteData?.guildID || !inviteData.guild) continue;

        if (!allowedGuilds.has(inviteData.guildID)) {
            silently(msg.delete());
            silently(msg.member!.edit({ communicationDisabledUntil: until(5 * Millis.MINUTE), reason: "invite" }));

            const inviteImage = await getInviteImage(code);
            logAutoModAction({
                content: `${msg.author.mention} posted an invite to ${inviteData.guild.name} in ${msg.channel!.mention}`,
                embeds: [{
                    ...makeEmbedForMessage(msg),
                    image: inviteImage ? { url: "attachment://invite.png" } : void 0
                }],
                files: inviteImage ? [{ name: "invite.png", contents: inviteImage }] : void 0
            });

            return true;
        }
    }

    return false;
}

// Vencord.Webpack.find(m => Array.isArray(m) && m.includes("exe"))
const suspiciousFileExtensions = new Set<string>(JSON.parse('["7z","ade","adp","arj","apk","application","appx","appxbundle","asx","bas","bat","cab","cer","chm","cmd","cnt","cpl","crt","csh","deb","der","diagcab","dll","dmg","docm","dotm","ex","ex_","exe","fxp","gadget","grp","gz","hlp","hpj","hta","htc","inf","ins","ipa","iso","isp","its","jar","jnlp","jse","ksh","lib","lnk","mad","maf","mag","mam","maq","mar","mas","mat","mau","mav","maw","mcf","mda","mdb","mde","mdt","mdw","mdz","msc","msh","msh1","msh1xml","msh2","msh2xml","mshxml","msi","msix","msixbundle","msp","mst","msu","nsh","ops","osd","pcd","pif","pkg","pl","plg","potm","ppam","ppsm","pptm","prf","prg","printerexport","ps1","ps1xml","ps2","ps2xml","psc1","psc2","psd1","psdm1","pst","py","pyc","pyo","pyw","pyz","pyzw","rar","reg","rpm","scf","scr","sct","shb","shs","sldm","sys","theme","tmp","url","vb","vbe","vbp","vbs","vhd","vhdx","vsmacros","vsw","vxd","webpnp","ws","wsc","wsf","wsh","xbap","xlam","xll","xlsm","xltm","xnk","z","zip"]'));

async function moderateSuspiciousFiles(msg: Message<AnyTextableGuildChannel>) {
    if (msg.member.roles.includes(Config.roles.regular)) return false;

    for (const attachment of msg.attachments.values()) {
        const ext = attachment.filename?.split(".").pop()?.toLowerCase();
        if (!ext || !suspiciousFileExtensions.has(ext)) continue;

        silently(msg.delete());
        silently(msg.member!.edit({ communicationDisabledUntil: until(10 * Millis.MINUTE), reason: "suspicious file attachment" }));
        logAutoModAction(`${msg.author.mention} posted a suspicious file (${attachment.filename}) in ${msg.channel!.mention}`);

        return true;
    }

    return false;
}

// for some reason, the scam bots LOVE posting to this channel
const GERMAN_CHANNEL_ID = "1121201005456011366";

export function initModListeners() {
    Vaius.on("guildMemberUpdate", moderateNick);
    Vaius.on("guildMemberAdd", moderateNick);

    Vaius.on("autoModerationActionExecution", async (guild, channel, user, data) => {
        if (data.action.type !== AutoModerationActionTypes.SEND_ALERT_MESSAGE) return;

        const includesPing = ["@everyone", "@here"].some(s => data.content.includes(s));
        const includesInvite = ["discord.gg/", "discord.com/invite", "discordapp.com/invite"].some(s => data.content.includes(s));

        const isSteamScam = (["[steamcommunity.com", "$ gift"].some(s => data.content.includes(s)) || channel?.id === GERMAN_CHANNEL_ID) &&
            ["https://u.to", "https://sc.link", "https://e.vg", "https://is.gd"].some(s => data.content.includes(s));

        const isMediaFireScam = data.content.includes("bro") && data.content.includes("mediafire") && data.content.includes("found");

        const isRobloxScam = data.content.includes("executor") && (
            includesInvite ||
            ["roblox", "free"].some(s => data.content.includes(s))
        );

        const isMrBeastScam = data.content.match(/\/[1-4]\.(jpe?g|gif|png|webp)/g)?.length! >= 2 ||
            (includesPing && new RegExp(String.raw`(https://(cdn|media)\.discordapp\.(net|com)/attachments/\d+/\d+/image\.(jpe?g|gif|png|webp)(\?\S+)?[\s\n]*){3,4}`).test(data.content));

        const isScam = isSteamScam || isMediaFireScam || isRobloxScam || isMrBeastScam;

        if (isScam) {
            await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: `scams (hacked account): ${data.content}`,
                deleteMessageDays: 1
            });
            await Vaius.rest.guilds.removeBan(guild.id, user.id, "soft-ban");

            logAutoModAction(`Soft-banned <@${user.id}> for posting a scam message.`);
            return;
        }

        if (includesPing && includesInvite) {
            await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: "tried to ping everyone with an invite (spam bot)",
                deleteMessageDays: 1
            });
            await Vaius.rest.guilds.removeBan(guild.id, user.id, "soft-ban");

            logAutoModAction(`Soft-banned <@${user.id}> for trying to ping everyone with an invite.`);
            return;
        }
    });

}

const TESSIE_ID = "1081940449717133374";
export async function lobotomiseMaybe(msg: Message<AnyTextableGuildChannel>) {
    if (msg.author.id !== TESSIE_ID || !msg.referencedMessage || msg.content !== "mods crush this person's skull") return false;

    try {
        await msg.referencedMessage.member!.edit({
            communicationDisabledUntil: until(10 * Millis.MINUTE),
            reason: "showing screenshot of automodded message"
        });

        silently(msg.referencedMessage.delete());

        silently(reply(msg, {
            content: "Lobotomised! 🔨"
        }));

        return true;
    } catch (e) {
        handleError(`Failed to lobotomise ${msg.referencedMessage.member?.id}`, e);
        return false;
    }
}
