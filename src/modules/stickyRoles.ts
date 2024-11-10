import { AuditLogActionTypes, Guild } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { db } from "~/db";
import { GUILD_ID } from "~/env";
import { reply } from "~/util";
import { isNonNullish } from "~/util/guards";

const ignoreRoles = new Set([
    "1166731271943237662", "1166731270542340146", "1166731273155379220", // Announcement Roles
    "1017523851342663783", // Server Booster
]);

const shouldIgnoreRole = (roleId: string, guild: Guild) => ignoreRoles.has(roleId) || !!guild.roles.get(roleId)?.managed;

Vaius.on("guildMemberAdd", async member => {
    if (member.guild.id !== GUILD_ID) return;

    const sticky = await db
        .selectFrom("stickyRoles")
        .select("roleIds")
        .where("id", "=", member.id)
        .executeTakeFirst();

    if (!sticky) return;
    await member.edit({ roles: sticky.roleIds.split(","), reason: "Sticky Roles" });
});

Vaius.on("guildAuditLogEntryCreate", async (maybeUncachedGuild, entry) => {
    if (maybeUncachedGuild.id !== GUILD_ID) return;
    if (entry.actionType !== AuditLogActionTypes.MEMBER_ROLE_UPDATE || !entry.targetID) return;

    const guild = maybeUncachedGuild instanceof Guild
        ? maybeUncachedGuild
        : Vaius.guilds.get(maybeUncachedGuild.id)!;

    const member = entry.targetID && await guild.getMember(entry.targetID).catch(() => null);
    if (!member) return;

    const roleIds = member.roles
        .filter(roleId => !shouldIgnoreRole(roleId, guild));

    if (roleIds.length === 0) {
        if (entry.changes!.some(c => c.key === "$remove"))
            await removeStickyRoles(entry.targetID);
    } else {
        await db
            .insertInto("stickyRoles")
            .values({
                id: entry.targetID,
                roleIds: roleIds.join(",")
            })
            .onConflict(oc => oc
                .column("id")
                .doUpdateSet({
                    roleIds: eb => eb.ref("excluded.roleIds")
                })
            )
            .execute();
    }
});

defineCommand({
    name: "save-roles",
    description: "Save the roles of all users to the sticky roles db",
    guildOnly: true,
    ownerOnly: true,
    usage: null,
    async execute({ msg }) {
        if (msg.guildID !== GUILD_ID) return;

        const members = await msg.guild.fetchMembers();

        const rows = members
            .map(m => {
                const roles = m.roles.filter(roleId => !shouldIgnoreRole(roleId, msg.guild));
                if (!roles.length) return null;
                return ({ id: m.id, roleIds: roles.join(",") });
            })
            .filter(isNonNullish);

        await db.deleteFrom("stickyRoles").execute();
        await db.insertInto("stickyRoles").values(rows).execute();

        await reply(msg, { content: `Saved ${rows.length} users' roles!` });
    },
});

export function removeStickyRoles(memberId: string) {
    return db
        .deleteFrom("stickyRoles")
        .where("id", "=", memberId)
        .execute();
}
