import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { DATA_DIR } from "~/constants";

const StateFile = join(DATA_DIR, "botState.json");

interface BotState {
    helloChannelId: string;
}

const state = (() => {
    try {
        return JSON.parse(readFileSync(StateFile, "utf8"));
    } catch {
        return {};
    }
})() as Partial<BotState>;

function saveSettings() {
    writeFileSync(StateFile, JSON.stringify(state, null, 4));
}

const proxyHandler = {} as ProxyHandler<any>;
for (const operation of ["set", "defineProperty", "deleteProperty"]) {
    proxyHandler[operation] = (...args: any[]) => {
        const res = Reflect[operation](...args);
        saveSettings();
        return res;
    };
}

export const BotState = new Proxy<Partial<BotState>>(state, proxyHandler);
