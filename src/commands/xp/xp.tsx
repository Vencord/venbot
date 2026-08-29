import { SeparatorSpacingSize, User } from "oceanic.js";
import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Emoji } from "~/constants";
import { db } from "~/db";
import { resolveUser } from "~/util/resolvers";
import { getLevelForXp, getRequiredXpForNextLevel, getXpForUser, setXpForUser } from "~/util/xpMath";
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
    aliases: ["level"],
    description: "Get your XP and level",
    usage: null,
    guildOnly: true,
    async execute({ msg, reply }, userResolvable) {
        const user = await resolveUser(userResolvable).catch(() => null) || msg.author;

        const userXp = await getXpForUser(user);
        const level = getLevelForXp(userXp.xp);
        const requiredXp = getRequiredXpForNextLevel(userXp.xp);

        return reply(await buildXpEmbed(level, userXp.xp, requiredXp, user, msg.author));
    },
});

defineCommand({
    name: "xp-add",
    description: "Add XP to a user",
    usage: "<user> <amount>",
    guildOnly: true,
    allowedRoles: [Config.roles.manager],
    async execute({ reply, react }, userResolvable, amount) {
        const user = await resolveUser(userResolvable).catch(() => null);
        if (!user) return reply("Invalid user!");

        const xpAmount = Number(amount);
        if (isNaN(xpAmount) || xpAmount <= 0) return reply("Invalid amount!");

        await setXpForUser(user, xpAmount);

        return void react(Emoji.CheckMark);
    },
});

defineCommand({
    name: "xp-reset",
    description: "Reset a user's XP",
    usage: "<user>",
    guildOnly: true,
    allowedRoles: [Config.roles.manager],
    async execute({ reply, react }, userResolvable) {
        const user = await resolveUser(userResolvable).catch(() => null);
        if (!user) return reply("Invalid user!");

        await db.deleteFrom("userXpLevel")
            .where("userId", "=", user.id)
            .execute();

        return void react(Emoji.CheckMark);
    },
});
