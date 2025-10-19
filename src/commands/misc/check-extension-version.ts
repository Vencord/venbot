import { defineCommand } from "~/Commands";
import { Millis } from "~/constants";
import { execFileP } from "~/util/childProcess";
import { makeCachedJsonFetch } from "~/util/fetch";
import { ttlLazy, ttlLazyFailure } from "~/util/lazy";

interface GithubTag {
    name: string;
}

const VersionRe = />Version<\/div><div class="[^"]+">(\d+\.\d+\.\d+)<\/div>/;

const getGithubTags = makeCachedJsonFetch<GithubTag[]>("https://api.github.com/repos/Vendicated/Vencord/tags");

const getChromeVersion = ttlLazy(async () => {
    // for some reason, nodejs fetch times out while curl works fine
    const { stdout } = await execFileP("curl", ["https://chromewebstore.google.com/detail/vencord-web/cbghhgpcnddeihccjmnadmkaejncjndb"]);

    const version = VersionRe.exec(stdout)?.[1];
    return version ?? ttlLazyFailure;
}, 5 * Millis.MINUTE);

defineCommand({
    name: "check-extension-version",
    description: "Check the version of the extension",
    aliases: ["extversion", "ext", "ev"],
    usage: null,
    async execute({ reply }) {
        const version = await getChromeVersion();
        if (!version) return reply("Failed to look up the Vencord Chrome Extension version :( Try again later!");

        const [latestTag] = await getGithubTags();

        const message = latestTag.name === `v${version}`
            ? `The Vencord Chrome Extension is up to date! (v${version})`
            : `The Vencord Chrome Extension is out of date! (v${version} vs ${latestTag.name})`;

        reply(message);
    }
});
