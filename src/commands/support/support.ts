import { join } from "path";
import * as v from "valibot";

import { defineCommand } from "~/Commands";
import { ASSET_DIR, Emoji, SUPPORT_ALLOWED_CHANNELS } from "~/constants";
import { run, silently } from "~/util/functions";
import { loadContentCollection } from "~/util/markdown";
import { toInlineCode } from "~/util/text";

export const SupportInstructions = Object.create(null) as Record<string, {
    content: string;
    emoji: string;
}>;
export const SupportTagList = [] as string[][];

defineCommand({
    name: "support",
    aliases: ["s"],
    description: "Query a support tag",
    usage: "[topic]",
    async execute({ msg, createMessage, react, reply }, ...guide) {
        if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!)) return;

        if (guide.length === 0 || (guide.length === 1 && ["help", "list"].includes(guide[0])))
            return reply(
                SupportTagList
                    .map(n => `${toInlineCode(SupportInstructions[n[0]].emoji)} ` + n.join(", "))
                    .join("\n")
            );

        let { content } = SupportInstructions[guide.join(" ").toLowerCase()] ?? {};
        if (!content) return react(Emoji.QuestionMark);

        if (msg.referencedMessage) {
            silently(msg.delete());
            content += `\n\n-# Auto-response invoked by ${msg.author.mention}`;
        }

        return createMessage({
            content,
            messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
            allowedMentions: { repliedUser: !!msg.referencedMessage }
        });
    },
});

const FrontMatterSchema = v.object({
    aliases: v.optional(
        v.pipe(
            v.string(),
            v.transform(p => p.split(",").map(x => x.trim()))
        )
    ),
    emoji: v.string()
});

run(async () => {
    const supportDir = join(ASSET_DIR, "support");

    for (const { file, frontmatter: { emoji, aliases }, content } of await loadContentCollection(supportDir, FrontMatterSchema)) {
        const name = file.slice(0, -3).toLowerCase();
        const names = [name];
        const data = { content, emoji };

        SupportInstructions[name] = data;
        aliases?.forEach(a => {
            SupportInstructions[a.trim().toLowerCase()] = data;
            names.push(a.trim().toLowerCase());
        });

        SupportTagList.push(names);
    }
});
