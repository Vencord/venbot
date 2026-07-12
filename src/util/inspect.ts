// Source: https://github.com/patarapolw/prettyprint
// SPDX-License-Identifier: MIT
// Copyright (c) 2020 Pacharapol Withayasakpunt

import util from "util";

class MultilineString {
    constructor(public s: string) { }

    [util.inspect.custom](_depth: number, options: util.InspectOptionsStylized) {
        return [
            "",
            ...this.s.split("\n").map(line => options.stylize(line, "string"))
        ].join("\n");
    }
}

function cloneAndReplace(obj: any, seen = new WeakSet) {
    if (obj && typeof obj === "object" && !seen.has(obj)) {
        seen.add(obj);
        if (Array.isArray(obj) && obj.constructor === Array) {
            const o = [] as any[];
            obj.map((el, i) => {
                o[i] = cloneAndReplace(el, seen);
            });
            return o;
        } else if (obj.constructor === Object) {
            const o = {} as any;
            Object.entries(obj).map(([k, v]) => {
                o[k] = cloneAndReplace(v, seen);
            });
            return o;
        }
    } else if (typeof obj === "string") {
        if (obj.includes("\n")) {
            return new MultilineString(obj);
        }
    }

    return obj;
}

export const inspect = (obj: any, options?: util.InspectOptions) => util.inspect(cloneAndReplace(obj), options);
