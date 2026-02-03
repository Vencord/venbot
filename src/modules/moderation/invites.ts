import { spawn } from "child_process";
import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { Vaius } from "~/Client";
import Config from "~/config";
import { Millis } from "~/constants";
import { silently } from "~/util/functions";
import { logAutoModAction } from "~/util/logAction";
import { until } from "~/util/time";
import { makeEmbedForMessage } from "./utils";

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

export async function moderateInvites(msg: Message<AnyTextableGuildChannel>) {
    for (const [, code] of msg.content.matchAll(inviteRe)) {
        const inviteData = await Vaius.rest.channels.getInvite(code, {}).catch(() => null);
        if (!inviteData?.guildID || !inviteData.guild) continue;

        if (!allowedGuilds.has(inviteData.guildID)) {
            silently(msg.delete());
            silently(msg.guild.editMember(msg.author.id, { communicationDisabledUntil: until(5 * Millis.MINUTE), reason: "invite" }));

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
