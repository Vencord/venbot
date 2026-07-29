import { createUserContent } from "@google/genai";
import { ai } from "../misc/gemini";

export async function parseBulkBadges(text: string) {
    // Behold, the future of text parsing!

    const prompt = `
    Your goal is to parse the following text and extract all the badge images and their corresponding names.
    The text may contain multiple badge images and names, and they may be in different formats and use different quoting styles or no quoting at all.
    There may also be other text like "the name should be" which you should ignore.

    Image format may be one of:
    - URL
    - Discord Emoji, e.g. <a:name:1532111967978913802>. In this case you should reformat it to a CDN url: https://cdn.discordapp.com/emojis/1532111967978913802.webp?size=128&animated=true. The <a:> part indicates that the emoji is animated. Always use webp

    Names may be blank, either by not being present or by being text like "No name". In this case, you should output a Zero Width Space character (U+200B) as the name.

    Output format should be a JSON array of arrays, where each inner array contains two elements: the badge image URL and the badge name. For example:
    [
        ["https://cdn.discordapp.com/emojis/1532111967978913802.webp?size=128&animated=true", "Badge Name"],
        ["https://example.com/badge2.png", "Another Badge Name"],
        ["https://example.com/badge3.png", "\u200B"]
    ]
    Respond only with the JSON array, and do not include any other text or formatting. Do not wrap the output in code blocks or quotes.
    `;

    const result = await ai.models.generateContent({
        model: "gemma-4-31b-it",
        contents: [
            createUserContent(prompt),
            createUserContent(text)
        ]
    });

    try {
        const parsed = JSON.parse(result.text!) as [string, string][];
        if (!Array.isArray(parsed) || !parsed.every(item => Array.isArray(item) && item.length === 2 && typeof item[0] === "string" && typeof item[1] === "string")) {
            throw new Error("Parsed result is not an array of [string, string] pairs.");
        }

        return parsed as [string, string][];
    } catch {
        throw new Error("Failed to parse the result as JSON. The result was: " + result.text);
    }
}
