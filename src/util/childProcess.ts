import cp from "child_process";
import { promisify } from "util";

export const execFileP = promisify(cp.execFile);
export const execP = promisify(cp.exec);
export const spawnP = function spawn(...args: Parameters<typeof cp.spawn>) {
    const child = cp.spawn(...args);
    return {
        child,
        promise: new Promise<void>((resolve, reject) => {
            child.on("error", reject);
            child.on("exit", code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Process exited with code ${code}`));
                }
            });
        })
    };
};
