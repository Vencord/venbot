import { defineCommand } from "~/Commands";
import { doFetch, makeCachedJsonFetch } from "~/util/fetch";

interface GithubTag {
    name: string;
}

const VersionRe = />Version<\/div><div class="[^"]+">(\d+\.\d+\.\d+)<\/div>/;

const getGithubTags = makeCachedJsonFetch<GithubTag[]>("https://api.github.com/repos/Vendicated/Vencord/tags");

defineCommand({
    name: "check-extension-version",
    description: "Check the version of the extension",
    aliases: ["extversion", "ext", "ev"],
    usage: null,
    async execute({ reply }) {
        const res = await doFetch("https://chromewebstore.google.com/detail/vencord-web/cbghhgpcnddeihccjmnadmkaejncjndb")
            .then(res => res.text());

        const version = VersionRe.exec(res)?.[1];

        if (!version) return reply("Failed to look up the Vencord Chrome Extension version :( Try again later!");

        const [latestTag] = await getGithubTags();

        const message = latestTag.name === `v${version}`
            ? `The Vencord Chrome Extension is up to date! (v${version})`
            : `The Vencord Chrome Extension is out of date! (v${version} vs ${latestTag.name})`;

        reply(message);
    }
});
