import { SeparatorSpacingSize, User } from "oceanic.js";
import { defineCommand } from "~/Commands";
import { db } from "~/db";
import { resolveUser } from "~/util/resolvers";
import { getLevelForXp, getRequiredXpForNextLevel } from "~/util/xpMath";
import { ComponentMessage, Container, Section, Separator, TextDisplay, Thumbnail } from "~components";

const vennieCatCozy = "<:venniecozycat:1216803437162004561>";

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
                <TextDisplay>{vennieCatCozy} {targetUser.id === commandUser.id ? "You" : targetUser.username} will need `{requiredXp - xp}` more XP to level up!</TextDisplay>
            </Container>
        </ComponentMessage>
    );
}

defineCommand({
    name: "xp",
    aliases: ["experience", "level"],
    description: "Get your XP and level",
    usage: null,
    guildOnly: true,
    async execute({ msg, reply }, userResolvable) {
        const user = await resolveUser(userResolvable).catch(() => null) || msg.author;

        const userXp = await db.selectFrom("userXpLevel")
            .selectAll()
            .where("userId", "=", user.id)
            .executeTakeFirst() ?? { xp: 0 };

        const level = getLevelForXp(userXp.xp);
        const requiredXp = getRequiredXpForNextLevel(userXp.xp);

        return reply(await buildXpEmbed(level, userXp.xp, requiredXp, user, msg.author));
    },
});
