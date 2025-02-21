import { AuditLogActionTypes } from "oceanic.js";

import { Vaius } from "~/Client";
import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { BotState } from "~/db/botState";
import { resolveChannel } from "~/util/resolvers";

defineCommand({
    name: "threads",
    aliases: ["thread"],
    description: "Watches your threads to make sure they always stay open! Specify a channel to watch all threads in that channel.",
    usage: "<[w]atch|[u]nwatch|[l]ist> [thread|channel]",
    guildOnly: true,
    modOnly: true,

    async execute({ reply, react, msg }, action = "list", threadOrChannelResolvable = msg.channelID) {
        action = action.toLowerCase();

        if ("list".startsWith(action))
            return reply(`Currently watching:\n${BotState.stickyThreads.map(id => `<#${id}>`).join("  ") || `${Emoji.SeeNoEvil} Nothing`}`);

        const isRemove = "unwatch".startsWith(action);
        if (!isRemove && !"watch".startsWith(action))
            return react(Emoji.QuestionMark);

        const threadOrChannel = await resolveChannel(threadOrChannelResolvable);
        if (!threadOrChannel)
            return reply("I couldn't find that channel/thread");

        const isListed = BotState.stickyThreads.includes(threadOrChannel.id);

        if (isRemove && !isListed)
            return reply("I wasn't watching that anyway you silly banana");

        if (!isRemove && isListed)
            return reply(`${Emoji.Owl} Two steps ahead of you `);

        if (isRemove) {
            BotState.stickyThreads = BotState.stickyThreads.filter(id => id !== threadOrChannel.id);

            return reply(`${Emoji.SeeNoEvil} Okay, no longer watching <#${threadOrChannel.id}>`);
        } else {
            BotState.stickyThreads = [...BotState.stickyThreads, threadOrChannel.id];

            return reply(`${Emoji.Owl} Okay, now watching <#${threadOrChannel.id}>`);
        }
    },
});

Vaius.on("threadUpdate", async (thread, oldThread) => {
    if (!thread.threadMetadata.archived) return;

    const isListed = BotState.stickyThreads.includes(thread.id) || BotState.stickyThreads.includes(thread.parentID);
    if (!isListed) return;

    const auditLog = await thread.guild.getAuditLog({ actionType: AuditLogActionTypes.THREAD_UPDATE, limit: 10 });

    const wasManualArchive = auditLog.entries.some(e =>
        e.targetID === thread.id &&
        e.userID &&
        e.changes?.some(c => c.key === "archived" && c.new_value === true)
    );

    if (wasManualArchive) return;

    await thread.edit({ archived: false, reason: "Automatically unarchived watched thread" });
});
