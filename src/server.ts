import Fastify from "fastify";
import { createReadStream } from "fs";

import Config from "./config";
import { PROD } from "./constants";

export const fastify = Fastify({
    logger: !PROD && {
        transport: {
            target: "pino-pretty",
        }
    }
});

fastify.get("/", (req, res) => {
    res
        .type("text/html")
        .send(createReadStream("assets/index.html"));
});

// defer listen to allow for fastify plugins to be registered before starting the server
setImmediate(() => {
    fastify.listen({ port: Config.httpServer.port }, err => {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
});
