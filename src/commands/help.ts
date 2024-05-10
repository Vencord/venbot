import { Commands, defineCommand, FullCommand } from "../Command";
import { PREFIX } from "../constants";
import { reply, ZWSP } from "../util";
import { pluralise, snakeToTitle, stripIndent, toTitle } from "../util/text";

defineCommand({
    name: "help",
    aliases: ["h", "?"],
    description: "List all commands or get help for a specific command",
    usage: "[command]",
    execute(msg, commandName) {
        if (!commandName)
            return reply(msg, { content: commandList() });

        const cmd = Commands[commandName];

        const content = cmd
            ? commandHelp(cmd)
            : `Command \`${commandName}\` not found.`;

        return reply(msg, { content });
    },
});

function commandList() {
    const commands = Object.entries(Commands)
        .filter(([name, cmd]) => !cmd.ownerOnly && cmd.name === name); // remove aliased commands

    const longestNameLength = commands.reduce((max, [name]) => Math.max(max, name.length), 0) + 1;

    const commandDescriptions = commands.map(([_, cmd], i) => {
        const paddedName = cmd.name.padEnd(longestNameLength, " ");
        return `\`${i === 0 ? ZWSP : ""} ${paddedName}\`   ${cmd.description}`;
    }).join("\n");

    return commandDescriptions + `\n\nUse \`${PREFIX}help <command>\` for more information on a specific command!`;
}

function commandHelp(cmd: FullCommand) {
    let help = stripIndent`
        ## \`${toTitle(cmd.name)}\` ${cmd.aliases ? `(${cmd.aliases.join(", ")})` : ""}

        ${cmd.description}
    `;

    const usage = !cmd.usage ? "" : stripIndent`
        ### Usage

        ${"```"}
        ${PREFIX}${cmd.name} ${cmd.usage}
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
