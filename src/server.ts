import Fastify from "fastify";
import { createReadStream } from "fs";

import { PROD } from "./constants";
import { HTTP_SERVER_LISTEN_PORT } from "./env";

export const fastify = Fastify({
    logger: !PROD
});

fastify.get("/", (req, res) => {
    res
        .type("text/html")
        .send(createReadStream("assets/index.html"));
});

fastify.listen({ port: HTTP_SERVER_LISTEN_PORT }, err => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});
