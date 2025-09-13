import Fastify from "fastify";

import { readFile } from "fs/promises";
import { PROD } from "./constants";
import { HTTP_SERVER_LISTEN_PORT } from "./env";
import { getGitRemote } from "./util/git";
import { makeLazy } from "./util/lazy";

export const fastify = Fastify({
    logger: !PROD && {
        transport: {
            target: "pino-pretty",
        }
    }
});

const getIndex = makeLazy(async () => {
    const contents = await readFile("assets/index.html", "utf-8");
    const remote = await getGitRemote();

    return contents.replace("%GIT_SOURCE_URL%", remote);
});

fastify.get("/", async (req, res) => {
    res
        .type("text/html")
        .send(await getIndex());
});

// defer listen to allow for fastify plugins to be registered before starting the server
setImmediate(() => {
    fastify.listen({ port: HTTP_SERVER_LISTEN_PORT }, err => {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
});
