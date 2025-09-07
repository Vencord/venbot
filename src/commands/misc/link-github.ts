import { randomUUID } from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { AnyTextableChannel, Message } from "oceanic.js";
import { InferOutput, nullable, number, object, parse, safeParse, string, union } from "valibot";

import { defineCommand } from "~/Commands";
import Config from "~/config";
import { Millis } from "~/constants";
import { db } from "~/db";
import { removeStickyRoles } from "~/modules/stickyRoles";
import { fastify } from "~/server";
import { getAsMemberInHomeGuild, sendDm } from "~/util/discord";
import { fetchJson } from "~/util/fetch";
import { silently } from "~/util/functions";

export const githubAuthStates = new Map<string, {
    id: string;
    timeoutId: NodeJS.Timeout;
    message: Message<AnyTextableChannel>;
}>();

const userSchema = object({
    login: string(),
    id: union([number(), string()])
});

const sponsorSchema = object({
    user: object({
        sponsorshipForViewerAsSponsorable: nullable(object({
            tier: object({
                name: string(),
                monthlyPriceInDollars: number()
            })
        }))
    })
});

const eventsSchema = object({
    total_count: number()
});

type User = InferOutput<typeof userSchema>;

class CheckError extends Error { }

const LinkedRoles: Array<{
    name: string;
    id: string;
    check(user: User, accessToken: string): Promise<false | string>;
}> = [
        {
            name: "Donor",
            id: Config.roles.donor,
            async check(user, accessToken) {
                const query = `
                    {
                        user(login: ${JSON.stringify(user.login)}) {
                            sponsorshipForViewerAsSponsorable(activeOnly: true) {
                                tier {
                                    name
                                    monthlyPriceInDollars
                                }
                            }
                        }
                    }
                `;
                const res = await fetchJson("https://api.github.com/graphql", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${Config.githubLinking.pat}`
                    },
                    body: JSON.stringify({ query })
                }).catch(() => null);

                if (!res)
                    throw new CheckError("Failed to fetch sponsor info from GitHub");

                const sponsorInfo = safeParse(sponsorSchema, res.data);
                if (!sponsorInfo.success)
                    throw new CheckError("Failed to parse sponsor info from GitHub");

                const sponsorTier = sponsorInfo.output.user.sponsorshipForViewerAsSponsorable?.tier;
                if (!sponsorTier)
                    return false;

                return `Based on your ${sponsorTier.name} sponsorship`;
            }
        },
        {
            name: "Contributor",
            id: Config.roles.contributor,
            async check(user, accessToken) {
                const res = await fetchJson(`https://api.github.com/search/commits?q=author:${user.login}+org:Vencord+repo:Vendicated%2FVencord&per_page=1`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }).catch(() => null);

                if (!res)
                    throw new CheckError("Failed to fetch user events from GitHub");

                const events = safeParse(eventsSchema, res);
                if (!events.success)
                    throw new CheckError("Failed to parse user events from GitHub");

                if (!events.output.total_count)
                    return false;

                return `Based on ${events.output.total_count} commits`;
            }
        }
    ];



fastify.register(
    (fastify, opts, done) => {
        function get<const Keys extends ReadonlyArray<string>>(
            route: string,
            extraKeys: Keys,
            handler: (request: FastifyRequest & { query: Record<Keys[number] | "userId" | "state", string>; }, response: FastifyReply) => unknown
        ) {
            fastify.get<{ Querystring: Record<Keys[number], string>; }>(
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

        const getRedirectUri = (userId: string) => `${Config.httpServer.domain}/github/callback?userId=${userId}`;

        get(
            "/authorize",
            [],
            (req, res) => {
                const params = new URLSearchParams({
                    client_id: Config.githubLinking.clientId,
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
                        client_id: Config.githubLinking.clientId,
                        client_secret: Config.githubLinking.clientSecret,
                        code: req.query.code,
                        redirect_uri: getRedirectUri(req.query.userId)
                    })
                });

                if (!githubResponse.ok)
                    return res.status(400).send("Failed to authorise with GitHub");

                const { access_token: accessToken } = await githubResponse.json() as any;

                const githubUser = await fetchJson("https://api.github.com/user", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                })
                    .then(data => parse(userSchema, data))
                    .catch(() => null);

                if (!githubUser)
                    return res.status(400).send("Failed to fetch user data from GitHub");

                const userAsMember = await getAsMemberInHomeGuild(req.query.userId);
                if (!userAsMember)
                    return res.status(400).send("You must be in the Vencord server to link your GitHub");

                clearTimeout(state.timeoutId);
                githubAuthStates.delete(req.query.userId);

                try {
                    var rolesToAdd = await Promise.all(LinkedRoles.map(async data => (
                        {
                            name: data.name,
                            id: data.id,
                            result: await data.check(githubUser, accessToken)
                        }
                    )));
                    rolesToAdd = rolesToAdd.filter(role => role.result !== false);
                } catch (err) {
                    if (!(err instanceof CheckError))
                        console.error("Error while linking role for", req.query.userId, err);

                    const message = err instanceof CheckError
                        ? err.message
                        : "Something unexpected happen";

                    return res.status(400).send(`Failed to link Github: ${message}.\n\nPlease try again later.`);
                }

                let result = `Successfully linked your GitHub account ${githubUser.login}.\n\n`;

                if (!rolesToAdd.length) {
                    result += "It doesn't seem like you have any roles to claim. Make sure you used the correct GitHub account\n\nYou can close this tab now.";
                    return res.send(result);
                }

                try {
                    const newRoles = rolesToAdd.map(role => role.id);
                    await userAsMember.edit({
                        roles: [
                            ...newRoles,
                            ...userAsMember.roles.filter(role => !newRoles.includes(role))
                        ],
                        reason: `Linked GitHub ${githubUser.login}`
                    });
                } catch {
                    result += "Failed to add roles to you. Please try again later.";
                    return res.status(400).send(result);
                }

                const existingLink = await db.transaction().execute(async t => {
                    const githubId = String(githubUser.id);

                    const existingLink = await t
                        .selectFrom("linkedGitHubs")
                        .select("discordId")
                        .where("githubId", "=", githubId)
                        .where("discordId", "!=", req.query.userId)
                        .executeTakeFirst();

                    await t.insertInto("linkedGitHubs")
                        .values({
                            discordId: req.query.userId,
                            githubId: githubId
                        })
                        .onConflict(oc =>
                            oc
                                .column("githubId")
                                .doUpdateSet(eb => ({
                                    discordId: eb.ref("excluded.discordId")
                                }))
                        )
                        .execute();

                    return existingLink;
                }).catch(() => null);

                if (existingLink) {
                    const previousMember = await getAsMemberInHomeGuild(existingLink.discordId);
                    if (previousMember) {
                        silently(previousMember.edit({
                            roles: previousMember.roles.filter(role => !rolesToAdd.some(r => r.id === role)),
                            reason: `Linked new Discord account ${req.query.userId} to GitHub ${githubUser.login}`
                        }));
                    } else {
                        removeStickyRoles(existingLink.discordId);
                    }
                }

                result += "Gave you the following role(s):\n";
                result += rolesToAdd.map(role => `- ${role.name} (${role.result})`).join("\n");

                res.send(`${result}\n\nYou can close this tab now.`);

                try {
                    await state.message.edit({ content: result });
                } catch {
                    silently(state.message.channel.createMessage({ content: result }));
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
    description: "Link your GitHub account to claim the contributor and donor role",
    aliases: ["github", "linkgithub", "gh", "link-gh"],
    usage: null,
    async execute({ msg, reply }) {
        if (githubAuthStates.has(msg.author.id))
            return reply("You already have a pending GitHub link prompt. Check in our DMs!");

        const member = await getAsMemberInHomeGuild(msg.author.id);
        if (!member)
            return reply("You must be in the Vencord server to link your GitHub.");

        const id = randomUUID();
        const oauthLink = `${Config.httpServer.domain}/github/authorize?userId=${msg.author.id}&state=${id}`;

        const sentMessage = await sendDm(msg.author, {
            content: `To link your GitHub account, please authorise [here](<${oauthLink}>)\n\nThis link will expire in 5 minutes.`
        });

        if (!sentMessage)
            return reply("I couldn't send you a DM. Please allow DMs from server members and try again.");

        if (msg.guildID)
            reply("I've sent you a DM with more info!");

        const timeoutId = setTimeout(() => {
            githubAuthStates.delete(msg.author.id);
        }, 5 * Millis.MINUTE);

        githubAuthStates.set(msg.author.id, { id, timeoutId, message: sentMessage });
    }
});
