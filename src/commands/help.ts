import { Commands, defineCommand, FullCommand } from "../Command";
import { PREFIX } from "../constants";
import { reply, ZWSP } from "../util";
import { snakeToTitle, stripIndent, toInlineCode, toTitle } from "../util/text";
import { translate } from "../util/translate";

defineCommand({
    name: "help",
    aliases: ["theylp", "shelp", "shiglp", "yardim", "yardım", "h", "?"],
    description: "List all commands or get help for a specific command",
    usage: "[command]",
    async execute(msg, commandName) {
        let content: string;

        const TÜRKVARMI = msg.content.includes("yardım") || msg.content.includes("yardim");

        if (!commandName) {
            content = await commandList(TÜRKVARMI);
        } else {
            let cmd = Commands[commandName];
            if (!cmd && commandName?.startsWith(PREFIX))
                cmd = Commands[commandName.slice(PREFIX.length)];

            content = cmd
                ? commandHelp(cmd)
                : `Command ${toInlineCode(commandName)} not found.`;

            if (TÜRKVARMI)
                content = (await translate(content, "en", "tr")).text.replaceAll("''''", "```").replaceAll("'", "`");
        }

        return reply(msg, { content });
    },
});

async function commandList(türk = false) {
    let commands = Object.entries(Commands)
        .filter(([name, cmd]) => !cmd.ownerOnly && cmd.name === name)
        .map(([name, cmd]) => [name, cmd.description]); // remove aliased commands

    let footer = `Use \`${PREFIX}help <command>\` for more information on a specific command!`;

    if (türk) {
        commands = await Promise.all(commands.map(([name, description]) =>
            translate(`${name};;;${description}`, "en", "tr")
                .then(t => t.text.split(";;;"))
        ));
        footer = (await translate(footer, "en", "tr")).text.replace("help", "yardım");
    }

    const longestNameLength = commands.reduce((max, [name]) => Math.max(max, name.length), 0) + 1;

    const commandDescriptions = commands.map(([name, description], i) => {
        const paddedName = name.padEnd(longestNameLength, " ");
        return `\`${i === 0 ? ZWSP : ""} ${paddedName}\`   ${description}`;
    }).join("\n");

    return commandDescriptions + "\n\n" + footer;
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
