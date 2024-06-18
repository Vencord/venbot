import esbuild from "esbuild";
import { readdir } from "fs/promises";
import { join } from "path";

/**
 * @type {esbuild.Plugin}
 */
const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        const filter = /^[^./|~]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    },
};

/**
 * @type {(dir: string) => Promise<string[]>}
 */
async function readDirRecursive(dir, base = "") {
    const children = await readdir(dir, { withFileTypes: true });

    return Promise.all(
        children.map(async c => {
            const fullName = join(base, c.name);
            if (c.isDirectory())
                return await readDirRecursive(join(dir, c.name), fullName);

            return fullName;
        })
    ).then(files => files.flat());
}

/**
 * @type {(namespace: string) => esbuild.Plugin}
 */
const includeDirPlugin = namespace => ({
    name: `include-dir-plugin:${namespace}`,
    setup(build) {
        const filter = new RegExp(`^~${namespace}$`);
        const dir = `./src/${namespace}`;

        build.onResolve(
            { filter },
            args => ({ path: args.path, namespace })
        );

        build.onLoad({ filter, namespace }, async () => {
            const files = await readDirRecursive(dir);
            console.log(files);
            return {
                contents: files.map(f => `import "./${f.replace(".ts", "")}"`).join("\n"),
                resolveDir: dir
            };
        });
    }
});

await esbuild.build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    plugins: [includeDirPlugin("commands"), includeDirPlugin("modules"), makeAllPackagesExternalPlugin],
    outfile: "dist/index.js",
    minify: false,
    treeShaking: true,
    target: "esnext",
    platform: "node",
    sourcemap: "linked",
    logLevel: "info"
});
