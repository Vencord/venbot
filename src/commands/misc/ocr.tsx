import { Message, MessageFlags } from "oceanic.js";
import { AutoResponseContentType } from "~/db";
import { resolveAutoResponse } from "~/modules/autoResponses";
import { registerMessageCommand } from "~/SlashCommands";
import { fetchBuffer } from "~/util/fetch";
import { readTextFromImage } from "~/util/ocr";
import { toCodeblock } from "~/util/text";

registerMessageCommand({
    name: "OCR",
    async handle(interaction) {
        const msg = interaction.data.target as Message;

        const flags = MessageFlags.EPHEMERAL

        if (!msg.attachments.size)
            return interaction.reply({ content: "No attachments found.", flags });

        await interaction.defer();

        const imageData = await fetchBuffer(msg.attachments.first()!.url);

        const text = await readTextFromImage(imageData);
        const autoResponse = resolveAutoResponse(text, AutoResponseContentType.IMAGES);

        let content = `## Extracted text\n${toCodeblock(text)}`;
        if (autoResponse)
            content += `\n## Auto-response\n${toCodeblock(autoResponse.response)}`;

        return interaction.reply({ content, flags });
    }
})
