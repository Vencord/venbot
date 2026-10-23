import { AutoModerationActionTypes } from "oceanic.js";
import { logAutoModAction } from "~/util/logAction";
import { Vaius } from "~/Vaius";
import { moderateNick } from "./nicknames";

// for some reason, the scam bots LOVE posting to this channel
const GERMAN_CHANNEL_ID = "1121201005456011366";

export function initModListeners() {
    Vaius.on("guildMemberUpdate", moderateNick);
    Vaius.on("guildMemberAdd", moderateNick);

    Vaius.on("autoModerationActionExecution", async (guild, channel, user, { action, content }) => {
        if (action.type !== AutoModerationActionTypes.SEND_ALERT_MESSAGE || !content) return;

        if (content.includes("s.undfe.com")) {
            logAutoModAction(`Banned <@${user.id}> for posting a malware link.`);
            return await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: "malware",
                deleteMessageDays: 1
            });
        }

        const includesPing = ["@everyone", "@here"].some(s => content.includes(s));
        const includesInvite = ["discord.gg/", "discord.com/invite", "discordapp.com/invite"].some(s => content.includes(s));

        const isSteamScam = (["[steamcommunity.com", "$ gift"].some(s => content.includes(s)) || channel?.id === GERMAN_CHANNEL_ID) &&
            ["https://u.to", "https://sc.link", "https://e.vg", "https://is.gd"].some(s => content.includes(s));

        const isMediaFireScam = content.includes("bro") && content.includes("mediafire") && content.includes("found");

        const isRobloxScam = content.includes("executor") && (
            includesInvite ||
            ["roblox", "free"].some(s => content.includes(s))
        );

        const isMrBeastScam = content.match(/\/[1-4]\.(jpe?g|gif|png|webp)/g)?.length! >= 2 ||
            (includesPing && new RegExp(String.raw`(https://(cdn|media)\.discordapp\.(net|com)/attachments/\d+/\d+/image\.(jpe?g|gif|png|webp)(\?\S+)?[\s\n]*){3,4}`).test(content));

        const isScam = isSteamScam || isMediaFireScam || isRobloxScam || isMrBeastScam;

        if (isScam) {
            await Vaius.rest.guilds.createBan(guild.id, user.id, {
                reason: `scams (hacked account): ${content}`,
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
