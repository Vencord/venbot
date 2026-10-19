import { Client } from "oceanic.js";
import Config from "./config";

export const Vaius = new Client({
    auth: "Bot " + Config.token,
    gateway: { intents: ["ALL_NON_PRIVILEGED", "MESSAGE_CONTENT", "GUILD_MEMBERS"] },
    allowedMentions: {
        everyone: false,
        repliedUser: false,
        roles: false,
        users: false
    }
});
