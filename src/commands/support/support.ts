import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { object, optional, string } from "valibot";

import { defineCommand } from "~/Command";
import { ASSET_DIR, Emoji, SUPPORT_ALLOWED_CHANNELS } from "~/constants";
import { reply, silently } from "~/util";
import { toInlineCode } from "~/util/text";
import { mustParse } from "~/util/validation";

export const SupportInstructions = {} as Record<string, {
    content: string;
    emoji: string;
}>;
export const SupportTagList = [] as string[][];

defineCommand({
    name: "support",
    aliases: ["s"],
    description: "Query a support tag",
    usage: "[topic]",
    async execute(msg, ...guide) {
        if (!SUPPORT_ALLOWED_CHANNELS.includes(msg.channel?.id!)) return;

        if (guide.length === 0 || (guide.length === 1 && ["help", "list"].includes(guide[0])))
            return reply(msg, SupportTagList.map(n => `${toInlineCode(SupportInstructions[n[0]].emoji)} ` + n.join(", ")).join("\n"));

        let { content } = SupportInstructions[guide.join(" ").toLowerCase()];
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

const FrontMatterSchema = object({
    aliases: optional(string()),
    emoji: string()
});

(async () => {
    const supportDir = join(ASSET_DIR, "support");
    const files = await readdir(supportDir);

    for (const file of files) {
        const name = file.slice(0, -3).toLowerCase();
        const names = [name];

        let content = (await readFile(join(supportDir, file), "utf8")).trim();

        const frontMatter = /^---\n(.+?)\n---/s.exec(content);
        if (!frontMatter) throw new Error("Missing frontmatter: " + file);
        content = content.slice(frontMatter[0].length).trim();
        const attrs = Object.fromEntries(
            frontMatter[1]
                .split("\n")
                .map(x => x.split(": ") as [string, string])
        );

        const { emoji, aliases } = mustParse(`Invalid frontmatter in ${file}`, FrontMatterSchema, attrs);

        const data = {
            content,
            emoji
        };

        SupportInstructions[name] = data;
        aliases?.split(",").forEach(a => {
            SupportInstructions[a.trim().toLowerCase()] = data;
            names.push(a.trim().toLowerCase());
        });

        SupportTagList.push(names);
    }
})();
