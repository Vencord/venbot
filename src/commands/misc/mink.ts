import { defineCommand } from "~/Commands";
import { makeLazy } from "~/util/lazy";

const ApiUrl = {
    Local: "http://localhost:47822",
    Remote: "https://minky.materii.dev"
};

const hasLocalMinkerApi = makeLazy(() =>
    fetch(ApiUrl.Local, { method: "HEAD" })
        .then(() => true)
        .catch(() => false)
);

defineCommand({
    name: "minky",
    aliases: ["mink", "minker"],
    description: "minker",
    usage: null,
    async execute({ reply }) {
        const url = await hasLocalMinkerApi()
            ? ApiUrl.Local
            : ApiUrl.Remote;

        const minker = await fetch(url)
            .then(r => r.ok ? r.arrayBuffer() : null);

        if (!minker)
            return reply("no mink :(");

        return reply({
            files: [{
                name: "mink.jpeg",
                contents: Buffer.from(minker)
            }]
        });
    }
});
