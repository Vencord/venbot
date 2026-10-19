import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { BaseIssue, BaseSchema } from "valibot";
import { mustParse } from "./validation";

export async function loadContentCollection<const FrontMatterSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(directory: string, frontMatterSchema: FrontMatterSchema) {
    const files = await readdir(directory);

    return Promise.all(files.map(async file => {
        let content = (await readFile(join(directory, file), "utf8")).trim();

        const frontMatter = /^---\n(.+?)\n---/s.exec(content);
        if (!frontMatter)
            throw new Error("Missing frontmatter: " + file);

        content = content.slice(frontMatter[0].length).trim();
        const attrs = Object.fromEntries(
            frontMatter[1]
                .split("\n")
                .map(x => x.split(": ") as [string, string])
        );

        return {
            file,
            frontmatter: mustParse(`Invalid frontmatter in ${file}`, frontMatterSchema, attrs),
            content
        };
    }));
}
