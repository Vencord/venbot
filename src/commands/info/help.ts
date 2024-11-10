import { AnyTextableChannel, EmbedOptions, Message } from "oceanic.js";

import { Commands, defineCommand, FullCommand } from "~/Commands";
import { PREFIXES } from "~/env";
import { reply, ZWSP } from "~/util";
import { getGitRemote } from "~/util/git";
import { groupBy } from "~/util/groupBy";
import { Paginator } from "~/util/Paginator";
import { makeEmbedSpaces, snakeToTitle, stripIndent, toInlineCode, toTitle } from "~/util/text";

defineCommand({
    name: "help",
    aliases: ["theylp", "shelp", "shiglp", "yardim", "yardım", "h", "?"],
    description: "List all commands or get help for a specific command",
    usage: "[command]",
    async execute(msg, commandName) {
        if (!commandName)
            return await createCommandList(msg);

        let cmd = Commands[commandName];
        if (!cmd) {
            const prefix = PREFIXES.find(p => commandName.startsWith(p));
            if (prefix)
                cmd = Commands[commandName.slice(prefix.length)];
        }

        const content = cmd
            ? commandHelp(cmd)
            : `Command ${toInlineCode(commandName)} not found.`;

        return reply(msg, { content });
    },
});

const formatCategory = (category: string) => toTitle(category, /[ -]/);

async function renderTableOfContents(pages: string[]): Promise<EmbedOptions> {
    const description = stripIndent`
        My prefixes are \`${PREFIXES.map(toInlineCode).join(", ")}\`.
        Use \`${PREFIXES[0]}help <command>\` for more information on a specific command!

        You can find my source code [here](${await getGitRemote()}).
    `;

    return {
        description: description + "\n" + ZWSP,
        fields: [
            {
                name: "Table of Contents",
                value: pages.map((page, i) => `${i + 1}. ${formatCategory(page) + (i === 0 ? "" : " Commands")}`).join("\n")
            }
        ]
    };
}

function renderHelpPage(Commands: FullCommand[]) {
    const longestNameLength = Commands.reduce((max, { name }) => Math.max(max, name.length), 0) + 1;

    const commandDescriptions = Commands.map(({ name, description }, i) => {
        const paddedName = name.padEnd(longestNameLength, " ");
        return `\`${i === 0 ? ZWSP : ""} ${paddedName}\`${makeEmbedSpaces(3)}${description}`;
    }).join("\n");

    const footer = `Use \`${PREFIXES[0]}help <command>\` for more information on a specific command!`;

    return commandDescriptions + "\n\n" + footer;
}

async function createCommandList(msg: Message<AnyTextableChannel>) {
    const categories = groupBy(
        Object.entries(Commands)
            .filter(([name, cmd]) => !cmd.ownerOnly && cmd.name === name && cmd.category !== "dev")
            .map(([, cmd]) => cmd),
        cmd => cmd.category
    );

    const pages = ["Table of Contents", ...Object.keys(categories)];

    const paginator = new Paginator<FullCommand>(
        "Help",
        pages as any,
        1,
        (commands, page) =>
            page === 0
                ? renderTableOfContents(pages)
                : renderHelpPage(commands),
    );
    paginator.getPageData = page => categories[pages[page]];
    paginator.getTitle = page =>
        page === 0
            ? "Help Menu"
            : `${formatCategory(pages[page])} Commands`;

    paginator.create(msg);
}

function commandHelp(cmd: FullCommand) {
    let help = stripIndent`
        ## \`${toTitle(cmd.name)}\` ${cmd.aliases ? `(${cmd.aliases.join(", ")})` : ""}

        ${cmd.description}
    `;

    const usage = !cmd.usage ? "" : stripIndent`
        ### Usage

        ${"```"}
        ${PREFIXES[0]}${cmd.name} ${cmd.usage}
        ${"```"}
    `;

    const notes = stripIndent`
        ${cmd.ownerOnly ? "`👑` this command is owner-only." : ""}
        ${cmd.permissions?.length
            ? `\`🛠️\` requires permissions: ${cmd.permissions.map(snakeToTitle).join(", ")}`
            : ""
        }
    `;

    for (const section of [usage, notes])
        if (section)
            help += `\n${section}\n`;

    return help;
}
