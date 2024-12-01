import { defineCommand } from "~/Commands";
import { Emoji } from "~/constants";
import { reply } from "~/util/discord";

defineCommand({
    name: "set-name",
    description: "Edit the current channel's name",
    usage: "<value>",
    aliases: ["setname", "sn", "rename"],
    guildOnly: true,
    modOnly: true,
    rawContent: true,
    async execute({ msg, react }, value) {
        if (!value)
            return reply(msg, "What's the new name?");

        msg.channel.edit({ name: value })
            .then(
                () => react(Emoji.CheckMark),
                () => react(Emoji.X)
            );
    }
});

defineCommand({
    name: "set-topic",
    description: "Edit the current channel's topic",
    usage: "<value>",
    aliases: ["settopic"],
    guildOnly: true,
    modOnly: true,
    rawContent: true,
    async execute({ msg, react, reply }, value) {
        if (!value)
            return reply("Did you forget the topic or something?");

        await msg.channel.edit({ topic: value })
            .then(
                () => react(Emoji.CheckMark),
                () => react(Emoji.X)
            );
    }
});
