import { sql } from "kysely";
import { CreateMessageOptions } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { db } from "~/db";
import { codeblock, reply } from "~/util";
import { inspect } from "~/util/inspect";
import stringWidth from "~/util/stringWidth";
import { countOccurrences } from "~/util/text";

defineCommand({
    name: "sql",
    description: "Evaluate SQL",
    usage: "query",
    rawContent: true,
    ownerOnly: true,
    async execute(msg, query) {
        query = query.replace(/(^`{3}(sql)?|`{3}$)/g, "");

        const param: TemplateStringsArray = Object.assign([query], { raw: [query] });

        let result: string;
        try {
            const { rows } = await sql(param).execute(db) as { rows: Record<string | number, any>[] };

            const lines = rows.map(r => Object.values(r).map(String));
            lines.unshift(Object.keys(rows[0]));

            const { markdownTable } = await import("markdown-table");
            result = markdownTable(lines, {
                stringLength: stringWidth
            });
        } catch (e) {
            result = inspect(e);
        }

        const maxLength = 2000 - 10 - countOccurrences(result, "`");
        const sendAsFile = result.length > maxLength || result.indexOf("\n") >= 120;

        const msgData: CreateMessageOptions = sendAsFile
            ? { files: [{ name: "result.txt", contents: Buffer.from(result) }] }
            : { content: codeblock(result.slice(0, maxLength)) };

        return reply(msg, msgData);
    }
});
