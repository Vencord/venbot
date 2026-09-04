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

const makeLeaderboard = () => async ({ msg, reply }) => {
    const stats = await db
        .selectFrom("xp")
        .select(({ fn }) => [
            "userId",
            fn.sum("xp").$castTo<number>().as("xp")
        ])
        .groupBy("userId")
        .orderBy("xp", "desc")
        .execute();

    if (!stats.length)
        return reply("No one has talked yet! Keep in mind that I only track XP from this server :3");

    const leaderboard = stats.map((user, index) => ({
        ...user,
        rank: index + 1
    }));

    const me = leaderboard.find(user => user.userId === msg.author.id);

    const paginator = new Paginator(
        "XP Leaderboard",
        leaderboard,
        20,
        users => {
            let result = formatCountAndName(
                users.map(({ rank, userId, xp }) => {
                    const name = userId === msg.author.id ? `**>> <@${userId}> <<**` : `<@${userId}>`;
                    return [`#${rank}`, `${name} - Level ${getLevelForXp(xp)}`];
                })
            );

            if (!users.some(user => user.userId === msg.author.id)) {
                result += "\n\n" + formatCountAndName([[`#${me?.rank ?? 0}`, `You - Level ${getLevelForXp(me?.xp ?? 0)}`]]);
            }

            return result;
        },
        `${leaderboard.length} users have earned XP • ${leaderboard.reduce((total, user) => total + user.xp, 0).toLocaleString()} total XP earned`
    );

    return paginator.create(msg);
};

defineCommand({
    name: "xp-leaderboard",
    aliases: ["xplb", "xp-lb", "xptop"],
    description: "Get the XP leaderboard",
    usage: null,
    guildOnly: true,
    execute: makeLeaderboard(),
});
