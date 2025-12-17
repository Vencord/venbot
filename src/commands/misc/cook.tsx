import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { fetchGoogle } from "~/util/fetch";

const segmenter = new Intl.Segmenter("en", {
    granularity: "grapheme"
});

function getEmojiSegments(input: string) {
    return Array.from(segmenter.segment(input), s => s.segment);
}

async function cook(emoji1: string, emoji2: string) {
    const url = "https://tenor.googleapis.com/v2/featured?" + new URLSearchParams({
        key: "AIzaSyACvEq5cnT7AcHpDdj64SE3TJZRhW-iHuo",
        client_key: "emoji_kitchen_funbox",
        q: `${emoji1}_${emoji2}`,
        collection: "emoji_kitchen_v6",
        contentfilter: "high"
    });

    const data = await fetchGoogle(url)
        .then(res => res.json());
    const result = data?.results?.[0];
    if (!result) return null;

    return {
        url: result.url,
        tags: result.tags
    };
}

defineCommand({
    name: "emoji-kitchen",
    aliases: ["cook", "kitchen", "emojikitchen"],
    usage: "<emoji1> <emoji2>",
    description: "Cook up an emoji",
    async execute({ react, reply }, emoji1, emoji2) {
        if (!emoji2 && emoji1) {
            [emoji1, emoji2] = getEmojiSegments(emoji1);
        }
        if (!emoji1 || !emoji2) return react(Emoji.QuestionMark);

        const data = await cook(emoji1, emoji2);
        if (!data) return reply("🧑‍🍳 No recipe found 🫨");

        return reply({
            content: "🧑‍🍳",
            embeds: [{
                image: { url: data.url }
            }]
        });
    },
});
