import { SeparatorSpacingSize, User } from "oceanic.js";
import { defineCommand } from "~/Commands";
import { db } from "~/db";
import { getEmoji } from "~/modules/emojiManager";
import { getLevelForXp, getRequiredXpForNextLevel, getXpForUser } from "~/modules/xp";
import { Paginator } from "~/util/Paginator";
import { resolveUser } from "~/util/resolvers";
import { ComponentMessage, Container, Section, Separator, TextDisplay, Thumbnail } from "~components";
import { formatCountAndName } from "../expression-tracker/commands/shared";

async function buildXpEmbed(level: number, xp: number, requiredXp: number, targetUser: User, commandUser: User) {
    return (
        <ComponentMessage>
            <Container>
                <Section accessory={<Thumbnail url={targetUser.avatarURL(undefined, 128)} />}>
                    <TextDisplay>## User XP </TextDisplay>
                    <TextDisplay>**` Level `**   {level} {level === 67 ? "<a:Mika67:1499544593182490777>" : ""}</TextDisplay>
                    <TextDisplay>**` XP    `**   {xp.toLocaleString()} / {requiredXp.toLocaleString()}</TextDisplay>
                </Section>
                <Separator spacing={SeparatorSpacingSize.LARGE} />
                <TextDisplay>-# {getEmoji("vennie")} {targetUser.id === commandUser.id ? "You" : targetUser.username} will need `{(requiredXp - xp).toLocaleString()}` more XP to level up!</TextDisplay>
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

defineCommand({
    name: "xp-leaderboard",
    aliases: ["xplb", "xp-lb", "xptop"],
    description: "Get the XP leaderboard",
    usage: null,
    guildOnly: true,
    async execute({ msg, reply }) {
        const xpStats = await db
            .selectFrom("xp")
            .select(({ fn }) => [
                fn.countAll().as("userCount"),
                fn.sum("xp").as("totalXp"),
            ])
            .orderBy("xp", "desc")
            .limit(1)
            .executeTakeFirst();

        if (!xpStats)
            return reply("No one has talked yet! Keep in mind that I only track XP from this server :3");

        const PAGE_SIZE = 20;

        const paginator = new Paginator(
            "XP Leaderboard",
            Array(xpStats.userCount),
            PAGE_SIZE,
            async (_data, page) => {
                const offset = PAGE_SIZE * page;
                const users = await db
                    .selectFrom("xp")
                    .select(["userId", "xp"])
                    .orderBy("xp", "desc")
                    .limit(PAGE_SIZE)
                    .offset(offset)
                    .execute();

                return formatCountAndName(
                    users.map(({ userId, xp }, idx) => {
                        const name = userId === msg.author.id
                            ? `**>> <@${userId}> <<**`
                            : `<@${userId}>`;

                        return [`#${offset + idx + 1}`, `${name} - Level ${getLevelForXp(xp)}`];
                    })
                );
            },
            `${xpStats.userCount.toLocaleString()} users have earned XP • ${xpStats.totalXp.toLocaleString()} total XP earned`
        );

        return paginator.create(msg);
    }
});
