import { readdir, readFile } from "fs/promises";
import { Message } from "oceanic.js";
import { join } from "path";
import { ASSET_DIR } from "~/constants";
import { sendDm } from "~/util/discord";
import { silently } from "~/util/functions";

// matches nothing
let imageHostRegex = /^(?!a)a/;

const annoyingDomainsDir = join(ASSET_DIR, "annoying-domains");
readdir(annoyingDomainsDir)
    .then(files =>
        Promise.all(
            files
                .filter(f => f !== "README.md")
                .map(async s => {
                    const content = await readFile(join(annoyingDomainsDir, s), "utf8");
                    return content.trim().split("\n");
                }))
    ).then(domains => {
        const list = domains
            .flat()
            .filter(Boolean)
            .map(d => d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));

        imageHostRegex = new RegExp(`https?://(\\w+\\.)?(${list.join("|")})`, "i");

        console.log(`Loaded ${list.length} image hosts`);
    });

export async function moderateImageHosts(msg: Message) {
    if (!imageHostRegex.test(msg.content))
        return false;

    return silently(msg.delete().then(() =>
        sendDm(msg.author, {
            content: "cdn.discordapp.com is a free and great way to share images! (Please stop using stupid image hosts)"
        })
    ));
}
