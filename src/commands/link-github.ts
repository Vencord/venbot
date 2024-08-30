import { randomUUID } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { AnyTextableChannel, Message } from "oceanic.js";

import { defineCommand } from "~/Command";
import { Millis } from "~/constants";
import { db } from "~/db";
import { CONTRIBUTOR_ROLE_ID, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, HTTP_DOMAIN } from "~/env";
import { fastify } from "~/server";
import { checkPromise, getAsMemberInMainGuild, reply, sendDm, silently } from "~/util";
import { fetchJson } from "~/util/fetch";
import { pluralise } from "~/util/text";

export const githubAuthStates = new Map<string, {
    id: string;
    timeoutId: NodeJS.Timeout;
    message: Message<AnyTextableChannel>;
}>();

fastify.register(
    (fastify, opts, done) => {
        function get<const Keys extends ReadonlyArray<string>>(
            route: string,
            extraKeys: Keys,
            handler: (request: FastifyRequest & { query: Record<Keys[number] | "userId" | "state", string>; }, response: FastifyReply) => unknown
        ) {
            fastify.get<{ Querystring: Record<Keys[number], string> }>(
                route,
                {
                    schema: {
                        querystring: {
                            type: "object",
                            required: [...extraKeys, "userId", "state"]
                        }
                    },
                    preHandler(req, res, done) {
                        const { userId, state } = req.query as Record<string, string>;
                        const storedState = githubAuthStates.get(userId);

                        if (!storedState || storedState.id !== state)
                            return res.status(400).send("Invalid authorization request");

                        done();
                    },
                    handler: handler as any
                }
            );
        }

        const getRedirectUri = (userId: string) => `${HTTP_DOMAIN}/github/callback?userId=${userId}`;

        get(
            "/authorize",
            [],
            (req, res) => {
                const params = new URLSearchParams({
                    client_id: GITHUB_CLIENT_ID,
                    redirect_uri: getRedirectUri(req.query.userId),
                    state: req.query.state,
                    allow_signup: "false"
                });

                return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
            }
        );

        get(
            "/callback",
            ["code"],
            async (req, res) => {
                const state = githubAuthStates.get(req.query.userId);
                if (!state)
                    throw new Error("Something went wrong");

                const githubResponse = await fetch("https://github.com/login/oauth/access_token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({
                        client_id: GITHUB_CLIENT_ID,
                        client_secret: GITHUB_CLIENT_SECRET,
                        code: req.query.code,
                        redirect_uri: getRedirectUri(req.query.userId)
                    })
                });

                if (!githubResponse.ok)
                    return res.status(500).send("Failed to authorize with GitHub");

                const { access_token: accessToken } = await githubResponse.json() as any;

                const user = await fetchJson("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }).catch(() => null);

                if (!user)
                    return res.status(500).send("Failed to fetch user data from GitHub");

                const events = await fetchJson(`https://api.github.com/search/commits?q=author:${user.login}+org:Vencord+repo:Vendicated%2FVencord&per_page=1`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!events)
                    return res.status(500).send("Failed to fetch user events from GitHub");

                clearTimeout(state.timeoutId);
                githubAuthStates.delete(req.query.userId);

                const existingLink = await db.transaction().execute(async t => {
                    const existingLink = await t
                        .selectFrom("linkedGitHubs")
                        .select("discordId")
                        .where("githubId", "=", user.id)
                        .where("discordId", "!=", req.query.userId)
                        .executeTakeFirst();

                    const value = { discordId: req.query.userId, githubId: user.id };

                    await t.insertInto("linkedGitHubs")
                        .values(value)
                        .onConflict(oc =>
                            oc
                                .column("githubId")
                                .doUpdateSet(eb => ({
                                    discordId: eb.ref("excluded.discordId")
                                }))
                        )
                        .execute();

                    return existingLink;
                });

                let message = `Successfully linked your GitHub account ${user.login}.\n\n`;

                if (events.total_count > 0) {
                    const amount = pluralise(events.total_count, "commit");
                    const member = await getAsMemberInMainGuild(req.query.userId);
                    if (member && await checkPromise(member.addRole(CONTRIBUTOR_ROLE_ID))) {
                        message += `You now have the contributor role! (Based on ${amount})`;

                        if (existingLink) {
                            const oldMember = await getAsMemberInMainGuild(existingLink.discordId);
                            if (oldMember && await checkPromise(oldMember.removeRole(CONTRIBUTOR_ROLE_ID)))
                                message += `\nI removed the contributor role from your old account <@${oldMember.id}>.`;
                        }
                    } else {
                        message += `You have contributed ${amount} to Vencord repositories, but I failed give you the contributor role.\nPlease try again or open a modmail`;
                    }
                } else {
                    message += "You have not contributed to any Vencord repositories.";
                }

                res.send(`${message}\n\nYou can close this tab now.`);

                try {
                    await state.message.edit({ content: message });
                } catch {
                    silently(state.message.channel.createMessage({ content: message }));
                }
            }
        );

        done();
    },
    {
        prefix: "/github"
    },
);


defineCommand({
    name: "link-github",
    description: "Link your GitHub account to claim the contributor role",
    aliases: ["github", "linkgithub", "gh", "link-gh"],
    usage: null,
    async execute(msg) {
        if (githubAuthStates.has(msg.author.id))
            return reply(msg, "You already have a pending GitHub link prompt. Check in our DMs!");

        const member = await getAsMemberInMainGuild(msg.author.id);
        if (!member)
            return reply(msg, "You must be in the Vencord server to link your GitHub.");

        const id = randomUUID();
        const oauthLink = `${HTTP_DOMAIN}/github/authorize?userId=${msg.author.id}&state=${id}`;

        const sentMessage = await sendDm(msg.author, {
            content: `To claim the contributor role, please [authorize with GitHub](<${oauthLink}>)\n\nThis link will expire in 5 minutes.`
        });

        if (!sentMessage)
            return reply(msg, "I couldn't send you a DM. Please allow DMs from server members and try again.");

        if (msg.guildID)
            reply(msg, "I've sent you a DM with more info!");

        const timeoutId = setTimeout(() => {
            githubAuthStates.delete(msg.author.id);
        }, 5 * Millis.MINUTE);

        githubAuthStates.set(msg.author.id, { id, timeoutId, message: sentMessage });
    }
});
