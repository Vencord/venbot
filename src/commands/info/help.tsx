import { SeparatorSpacingSize } from "oceanic.js";

import { CommandContext, Commands, defineCommand, FullCommand } from "~/Commands";
import Config from "~/config";
import { ZWSP } from "~/constants";
import { getGitRemote } from "~/util/git";
import { groupBy } from "~/util/groupBy";
import { PaginatorCv2 } from "~/util/PaginatorCv2";
import { makeEmbedSpaces, snakeToTitle, stripIndent, toCodeblock, toInlineCode, toTitle } from "~/util/text";
import { ActionRow, ComponentMessage, Container, Separator, StringSelect, TextDisplay } from "~components";

defineCommand({
    name: "help",
    aliases: ["theylp", "shelp", "shiglp", "yardim", "yardım", "h", "?"],
    description: "List all commands or get help for a specific command",
    usage: "[command]",
    async execute(ctx, commandName) {
        const { prefix, reply } = ctx;

        if (!commandName)
            return await createCommandList(ctx);

        let cmd = Commands[commandName];
        if (!cmd && commandName.startsWith(prefix))
            cmd = Commands[commandName.slice(prefix.length)];

        const content = cmd
            ? commandHelp(cmd, ctx)
            : (
                <ComponentMessage>
                    <TextDisplay>{`Command ${toInlineCode(commandName)} not found.`}</TextDisplay>
                </ComponentMessage>
            );

        return reply(content);
    },
});

const formatCategory = (category: string) => toTitle(category, /[ -]/) + " Commands";

function JumpToCategory({ pages, paginatorId }: { pages: string[], paginatorId: string; }) {
    return (
        <>
            <Separator spacing={SeparatorSpacingSize.LARGE} />
            <ActionRow>
                <StringSelect customID={`paginator:go-to:${paginatorId}`} placeholder="Jump to category">
                    {pages.map((p, i) => ({ label: formatCategory(p), value: String(i) }))}
                </StringSelect>
            </ActionRow>
        </>
    );
}

async function renderTableOfContents(pages: string[], { prefix, commandName }: CommandContext, id: string) {
    const description = stripIndent`
        My ${Config.prefixes.length === 1 ? "prefix is" : "prefixes are"} ${Config.prefixes.map(toInlineCode).join(", ")}.
        Use \`${prefix}${commandName} <command>\` for more information on a specific command!

        You can find my source code [here](${await getGitRemote()}).
    `;

    return (
        <>
            <TextDisplay>{description}</TextDisplay>
            <JumpToCategory pages={pages} paginatorId={id} />
        </>
    );
}

function renderHelpPage(Commands: FullCommand[], { prefix, commandName }: CommandContext, pages: string[], paginatorId: string) {
    const longestNameLength = Commands.reduce((max, { name }) => Math.max(max, name.length), 0) + 1;

    const commandDescriptions = Commands.map(({ name, description }, i) => {
        const paddedName = name.padEnd(longestNameLength, " ");
        return `\`${i === 0 ? ZWSP : ""} ${paddedName}\`${makeEmbedSpaces(3)}${description}`;
    }).join("\n");

    const footer = `Use \`${prefix}${commandName} <command>\` for more information on a specific command!`;

    return (
        <>
            <TextDisplay>{commandDescriptions}</TextDisplay>
            <Separator spacing={SeparatorSpacingSize.LARGE} divider={false} />
            <TextDisplay>{footer}</TextDisplay>
            <JumpToCategory pages={pages} paginatorId={paginatorId} />
        </>
    );
}

async function createCommandList(ctx: CommandContext) {
    const categories = groupBy(
        Object.entries(Commands)
            .filter(([name, cmd]) => !cmd.ownerOnly && cmd.name === name && cmd.category !== "dev")
            .map(([, cmd]) => cmd),
        cmd => cmd.category
    );

    const pages = Object.keys(categories);

    const paginator = new PaginatorCv2<FullCommand>(
        "Help Menu",
        pages as any,
        1,
        (commands, page) => renderHelpPage(commands, ctx, pages, paginator.id)
    );
    paginator.getPageData = page => categories[pages[page]];
    paginator.getTitle = page => formatCategory(pages[page]);
    paginator.renderTableOfContents = () => renderTableOfContents(pages, ctx, paginator.id);

    paginator.create(ctx.msg);
}

function commandHelp(cmd: FullCommand, { prefix }: CommandContext) {
    const notes = stripIndent`
        ${cmd.ownerOnly ? "`👑` This command is owner-only" : ""}
        ${cmd.permissions?.length
            ? `\`🛠️\` Requires permissions: ${cmd.permissions.map(snakeToTitle).join(", ")}`
            : ""
        }
        ${cmd.guildOnly ? "`🏠` This command can only be used in servers" : ""}
        ${cmd.modOnly ? "`🔨` This command can only be used by server moderators" : ""}
    `;

    return (
        <ComponentMessage>
            <Container>
                <TextDisplay>## {toTitle(cmd.name)}</TextDisplay>
                <TextDisplay>{cmd.description}</TextDisplay>
                <Separator />

                {cmd.aliases && (
                    <TextDisplay>
                        ### Aliases
                        <br />
                        {cmd.aliases.map(toInlineCode).join(", ")}
                    </TextDisplay>
                )}
                {cmd.usage && (
                    <TextDisplay>
                        ### Usage
                        <br />
                        {toCodeblock(`${prefix}${cmd.name} ${cmd.usage}`)}
                    </TextDisplay>
                )}

                {!!notes && (
                    <>
                        <Separator spacing={SeparatorSpacingSize.LARGE} />
                        <TextDisplay>{notes}</TextDisplay>
                    </>
                )}
            </Container>
        </ComponentMessage>
    );
}
