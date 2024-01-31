import cp from "child_process";
import { promisify } from "util";

export const execFile = promisify(cp.execFile);
export const exec = promisify(cp.exec);
