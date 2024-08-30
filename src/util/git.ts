import { execFile } from "~/util/childProcess";

import { makeLazy } from "./lazy";

export const getGitRemote = makeLazy(async () => {
    const res = await execFile("git", ["remote", "get-url", "origin"]);
    return res.stdout
        .trim()
        .replace(/\.git$/, "")
        .replace(/^git@(.+?):/, "https://$1/");
});
