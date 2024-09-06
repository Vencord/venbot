import { defineCommand } from "~/Commands";
import { reply } from "~/util";

defineCommand({
    name: "forgejo-down?",
    aliases: ["fj-down?", "ifd", "is-forgejo-down", "fjd?"],
    description: "Check if Ninos Forgejo is down",
    usage: null,
    async execute(msg) {
        const res = await fetch("https://git.nin0.dev/")
            .then(r => r.ok
                ? "No"
                : `Yes (HTTP Status ${r.status})`
            )
            .catch(() => "Yes (Unreachable)");

        return reply(msg, res);
    }
});
