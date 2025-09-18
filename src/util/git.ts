import { execFileP } from "~/util/childProcess";

import { makeLazy } from "./lazy";

export const getGitRemote = makeLazy(async () => {
    const { stdout } = await execFileP("git", ["remote", "get-url", "origin"]);
    return stdout
        .trim()
        .replace(/\.git$/, "")
        .replace(/^git@(.+?):/, "https://$1/");
});
