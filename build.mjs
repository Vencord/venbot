import esbuild from "esbuild";
import { readdir } from "fs/promises";

/**
 * @type {esbuild.Plugin}
 */
const makeAllPackagesExternalPlugin = {
    name: "make-all-packages-external",
    setup(build) {
        const filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
    },
};

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
            const files = await readdir(dir);
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
