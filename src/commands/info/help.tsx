import { Component, ComponentTypes, SeparatorSpacingSize } from "oceanic.js";

import { CommandContext, Commands, defineCommand, FullCommand } from "~/Commands";
import Config from "~/config";
import { ZWSP } from "~/constants";
import { groupBy } from "~/util/arrays";
import { getGitRemote } from "~/util/git";
import { PaginatorCv2 } from "~/util/PaginatorCv2";
import { makeEmbedSpaces, snakeToTitle, stripIndent, toCodeblock, toInlineCode, toTitle } from "~/util/text";
import { translate } from "~/util/translate";
import { ActionRow, ComponentMessage, Container, Separator, StringOption, StringSelect, TextDisplay } from "~components";

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

        await turkify(content.components);

        return reply(content);
    },
});

const formatCategory = (category: string) => toTitle(category, /[ -]/) + " Commands";

async function turkify(components: Component[]) {
    for (const c of components) {
        if (c.type === ComponentTypes.TEXT_DISPLAY && !c.content.includes("```")) {
            c.content = (await translate(c.content, "en", "tr")).text;
            continue;
        }

        // @ts-expect-error
        if (c.components && c.components.length > 1) {
            // @ts-expect-error
            await turkify(c.components);
        }
    }
}

function JumpToCategory({ pages, paginator }: { pages: string[], paginator: PaginatorCv2<FullCommand>; }) {
    return (
        <>
            <Separator spacing={SeparatorSpacingSize.LARGE} />
            <ActionRow>
                <StringSelect customID={`paginator:go-to:${paginator.id}`} placeholder="Jump to category" disabled={paginator.isDestroyed}>
                    {pages.map((p, i) => <StringOption label={formatCategory(p)} value={String(i)} />)}
                </StringSelect>
            </ActionRow>
        </>
    );
}

async function renderTableOfContents(pages: string[], { prefix, commandName }: CommandContext, paginator: PaginatorCv2<FullCommand>) {
    const description = stripIndent`
        My ${Config.prefixes.length === 1 ? "prefix is" : "prefixes are"} ${Config.prefixes.map(toInlineCode).join(", ")}.
        Use \`${prefix}${commandName} <command>\` for more information on a specific command!

        You can find my source code [here](${await getGitRemote()}).
    `;

    return (
        <>
            <TextDisplay>{description}</TextDisplay>
            <JumpToCategory pages={pages} paginator={paginator} />
        </>
    );
}

function renderHelpPage(Commands: FullCommand[], { prefix, commandName }: CommandContext, pages: string[], paginator: PaginatorCv2<FullCommand>) {
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
            <JumpToCategory pages={pages} paginator={paginator} />
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

    const paginator: PaginatorCv2<FullCommand> = new PaginatorCv2<FullCommand>(
        "Help Menu",
        pages as any,
        1,
        (commands, page) => renderHelpPage(commands, ctx, pages, paginator)
    );
    paginator.getPageData = page => categories[pages[page]];
    paginator.getTitle = page => formatCategory(pages[page]);
    paginator.renderTableOfContents = () => renderTableOfContents(pages, ctx, paginator);

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
