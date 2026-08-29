import { SeparatorSpacingSize, User } from "oceanic.js";
import { defineCommand } from "~/Commands";
import { getEmoji } from "~/modules/emojiManager";
import { getLevelForXp, getRequiredXpForNextLevel, getXpForUser } from "~/modules/xp";
import { resolveUser } from "~/util/resolvers";
import { ComponentMessage, Container, Section, Separator, TextDisplay, Thumbnail } from "~components";

async function buildXpEmbed(level: number, xp: number, requiredXp: number, targetUser: User, commandUser: User) {
    return (
        <ComponentMessage>
            <Container>
                <Section accessory={<Thumbnail url={targetUser.avatarURL(undefined, 128)} />}>
                    <TextDisplay>## Level Statistics</TextDisplay>
                    <TextDisplay>` level `   {level}</TextDisplay>
                    <TextDisplay>` xp    `   {xp} / {requiredXp}</TextDisplay>
                </Section>
                <Separator spacing={SeparatorSpacingSize.LARGE} />
                <TextDisplay>{getEmoji("vennie")} {targetUser.id === commandUser.id ? "You" : targetUser.username} will need `{requiredXp - xp}` more XP to level up!</TextDisplay>
            </Container>
        </ComponentMessage>
    );
}

defineCommand({
    name: "xp",
    aliases: ["level"],
    description: "Get your XP and level",
    usage: null,
    guildOnly: true,
    async execute({ msg, reply }, userResolvable) {
        const user = await resolveUser(userResolvable) ?? msg.author;

        const userXp = await getXpForUser(user);
        const level = getLevelForXp(userXp.xp);
        const requiredXp = getRequiredXpForNextLevel(userXp.xp);

        return reply(await buildXpEmbed(level, userXp.xp, requiredXp, user, msg.author));
    },
});
