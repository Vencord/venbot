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
 * @type {(files: string[], baseDir?: string) => string}
 */
const makeImportAllCode = (files, baseDir = "") => files.map(f => `require("./${baseDir}${f.replace(/\.[cm]?[tj]sx?$/, "")}")`).join("\n");

/**
 * @type {(dir: string, baseDir?: string) => Promise<string>}
 */
const makeImportDirRecursiveCode = (dir, baseDir) => readDirRecursive(dir).then(files => makeImportAllCode(files, baseDir));

/**
 * @type {(namespace: string, withCategories?: boolean) => esbuild.Plugin}
 */
const includeDirPlugin = namespace => ({
    name: `include-dir-plugin:${namespace}`,
    setup(build) {
        const filter = new RegExp(`^__${namespace}__$`);
        const dir = `src/${namespace}`;

        build.onResolve(
            { filter },
            args => ({ path: args.path, namespace })
        );

        build.onLoad({ filter, namespace }, async args => {
            if (namespace === "commands") {
                let contents = "export default {\n";
                for (const category of await readdir(dir)) {
                    const categoryLoader = await makeImportDirRecursiveCode(join(dir, category), category + "/");
                    contents += `[${JSON.stringify(category)}]() {\n${categoryLoader}\n},\n`;
                }
                contents += "}";

                return {
                    contents,
                    resolveDir: dir
                };
            }

            return {
                contents: await makeImportDirRecursiveCode(dir),
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
    logLevel: "info",
    jsx: "transform",
    inject: ["components-jsx/runtime.ts"],
    jsxFactory: "createElement",
    jsxFragment: "Fragment",
    logOverride: { "direct-eval": "silent" }
});
