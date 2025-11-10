import { ApplicationCommandOptionTypes, ApplicationCommandTypes, CreateMessageOptions, InteractionTypes, MessageFlags, SeparatorSpacingSize } from "oceanic.js";
import { Vaius } from "~/Client";
import { Commands, defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { getEmoji } from "~/modules/emojiManager";
import { handleCommandInteraction, handleInteraction } from "~/SlashCommands";
import { formatLanguage, GoogleLanguageMap, Locale, translate } from "~/util/translate";
import { ComponentMessage, Container, Separator, TextDisplay } from "~components";

async function doTranslate(content: string, sourceLanguage: Locale, targetLanguage: Locale): Promise<CreateMessageOptions> {
    const { text, src } = await translate(content, sourceLanguage, targetLanguage);

    return (
        <ComponentMessage>
            <Container>
                <TextDisplay>{text}</TextDisplay>
                <Separator divider={false} spacing={SeparatorSpacingSize.SMALL} />
                <TextDisplay>-# {getEmoji("google_translate")}  {formatLanguage(src)} {"->"} {formatLanguage(targetLanguage)}</TextDisplay>
            </Container>
        </ComponentMessage>
    );
}

defineCommand({
    name: "translate",
    aliases: ["tr", "trans", "t"],
    description: "Translate text between languages. If you want to change the language, use /translate",
    usage: "<text>",
    rawContent: true,
    async execute({ msg, react, reply }, content) {
        content ??= msg.referencedMessage?.content!;

        if (!content) return react(Emoji.QuestionMark);

        const defaultLanguage = msg.channelID === "1121201005456011366" ? "de" : "en";

        return reply(await doTranslate(content, "auto", defaultLanguage));
    },
});

Vaius.once("ready", async () => {
    await Vaius.application.createGuildCommand(Config.homeGuildId, {
        type: ApplicationCommandTypes.CHAT_INPUT,
        name: "translate",
        description: "Translate text between languages",
        options: [
            {
                name: "text",
                description: "The text to translate",
                type: ApplicationCommandOptionTypes.STRING,
                required: true
            },
            {
                name: "from",
                description: "The source language (default: auto-detect)",
                type: ApplicationCommandOptionTypes.STRING,
                autocomplete: true
            },
            {
                name: "to",
                description: "The target language (default: English)",
                type: ApplicationCommandOptionTypes.STRING,
                autocomplete: true
            },
            {
                name: "ephemeral",
                description: "Whether the response should be ephemeral (only visible to you)",
                type: ApplicationCommandOptionTypes.BOOLEAN,
                required: false
            }
        ]
    });

    Vaius.application.createGuildCommand(Config.homeGuildId, {
        type: ApplicationCommandTypes.MESSAGE,
        name: "Translate to English"
    });

    const cmd = await Vaius.application.getGuildCommands(Config.homeGuildId);
    const translateCmd = cmd.find(c => c.name === "translate");
    if (!translateCmd) return;

    Commands.translate.description = Commands.translate.description.replace("/translate", `</translate:${translateCmd.id}>`);
});

handleCommandInteraction({
    name: "translate",
    async handle(interaction) {
        const text = interaction.data.options.getString("text", true);
        const sourceLang = interaction.data.options.getString("from") || "auto";
        const targetLang = interaction.data.options.getString("to") || "en";
        const ephemeral = interaction.data.options.getBoolean("ephemeral") || false;

        const flags = ephemeral ? MessageFlags.EPHEMERAL : 0;

        interaction.defer(flags);

        const res = await doTranslate(text, sourceLang as Locale, targetLang as Locale);
        res.flags! |= flags;

        interaction.createFollowup(res);
    },
});

handleCommandInteraction({
    name: "Translate to English",
    async handle(interaction) {
        if (!interaction.isMessageCommand()) return;

        const { content, channelID } = interaction.data.target;

        if (!content)
            return interaction.reply({
                flags: MessageFlags.EPHEMERAL,
                content: "The selected message has no content to translate."
            });

        interaction.defer();

        const defaultLanguage = channelID === "1121201005456011366" ? "de" : "en";

        interaction.createFollowup(await doTranslate(interaction.data.target.content, "auto", defaultLanguage));
    },
});

handleInteraction({
    type: InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE,
    isMatch: i => i.data.name === "translate",
    async handle(i) {
        const input = (i.data.options.getFocused(true).value as string).toLowerCase();

        i.result(
            Object.keys(GoogleLanguageMap)
                .filter(code => code.includes(input) || GoogleLanguageMap[code as Locale].name.toLowerCase().includes(input))
                .slice(0, 25)
                .map(code => ({
                    name: `${GoogleLanguageMap[code as Locale].flag} ${GoogleLanguageMap[code as Locale].name}`,
                    value: code
                }))
        );
    }
});
