import { sql } from "kysely";
import { CreateMessageOptions } from "oceanic.js";

import { defineCommand } from "~/Commands";
import { db } from "~/db";
import { run } from "~/util/functions";
import { inspect } from "~/util/inspect";
import stringWidth from "~/util/stringWidth";
import { countOccurrences, pluralise, toCodeblock } from "~/util/text";

defineCommand({
    name: "sql",
    description: "Evaluate SQL",
    usage: "query",
    rawContent: true,
    ownerOnly: true,
    async execute({ reply }, query) {
        query = query.replace(/(^`{3}(sql)?|`{3}$)/g, "");

        const param: TemplateStringsArray = Object.assign([query], { raw: [query] });

        const result = await run(async () => {
            try {
                const { rows, numAffectedRows, numChangedRows } = await sql<Record<string | number, any>[]>(param).execute(db);

                if (rows.length) {
                    const lines = rows.map(r => Object.values(r).map(String));
                    lines.unshift(Object.keys(rows[0]));

                    const { markdownTable } = await import("markdown-table");
                    return markdownTable(lines, { stringLength: stringWidth });
                }

                if (numAffectedRows != null) return pluralise(Number(numAffectedRows), "affected row");

                return "No output";
            } catch (e) {
                return inspect(e);
            }
        });

        const maxLength = 2000 - 10 - countOccurrences(result, "`");
        const sendAsFile = result.length > maxLength || result.indexOf("\n") >= 120;

        const msgData: CreateMessageOptions = sendAsFile
            ? { files: [{ name: "result.txt", contents: Buffer.from(result) }] }
            : { content: toCodeblock(result.slice(0, maxLength)) };

        return reply(msgData);
    }
});
