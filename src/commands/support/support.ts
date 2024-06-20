import { readdir, readFile } from "fs/promises";
import { join } from "path";

import { defineCommand } from "~/Command";
import { ASSET_DIR, Emoji, SUPPORT_ALLOWED_CHANNELS } from "~/constants";
import { reply, silently } from "~/util";

export const SupportInstructions = {} as Record<string, string>;
export const SupportTagList = [] as string[][];

defineCommand({
    name: "support",
    aliases: ["s"],
    description: "Query a support tag",
    usage: "[topic]",
    async execute(msg, ...guide) {
        if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!)) return;

        if (guide.length === 0 || (guide.length === 1 && ["help", "list"].includes(guide[0])))
            return reply(msg, SupportTagList.map(n => "- " + n.join(", ")).join("\n"));

        let content = SupportInstructions[guide.join(" ").toLowerCase()];
        if (!content) return silently(msg.createReaction(Emoji.QuestionMark));

        if (msg.referencedMessage) {
            silently(msg.delete());
            content += `\n\n(Auto-response invoked by ${msg.author.mention})`;
        }

        return msg.channel.createMessage({
            content,
            messageReference: { messageID: msg.referencedMessage?.id ?? msg.id },
            allowedMentions: { repliedUser: !!msg.referencedMessage }
        });
    },
});

(async () => {
    const supportDir = join(ASSET_DIR, "support");
    const files = await readdir(supportDir);

    for (const file of files) {
        const name = file.slice(0, -3).toLowerCase();
        const names = [name];

        let content = (await readFile(join(supportDir, file), "utf8")).trim();

        const frontMatter = /^---\n(.+?)\n---/s.exec(content);
        if (frontMatter) {
            content = content.slice(frontMatter[0].length).trim();
            const attrs = Object.fromEntries(
                frontMatter[1].split("\n").map(x => x.split(": ") as [string, string])
            );

            attrs.aliases?.split(",").forEach(a => {
                SupportInstructions[a.trim().toLowerCase()] = content;
                names.push(a.trim().toLowerCase());
            });
        }

        SupportInstructions[name] = content;
        SupportTagList.push(names);
    }
})();
