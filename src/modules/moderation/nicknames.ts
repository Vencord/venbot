import { Member } from "oceanic.js";
import { Vaius } from "~/Client";
import { silently } from "~/util/functions";

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
