import { defineCommand } from "~/Commands";

const LatinxRoleId = "1189709037688868964";

defineCommand({
    name: "locatelatinx",
    aliases: ["findlatinx", "ll", "wherelatinx", "latinx", "latinxia"],
    description: "Locate the elusive latinx",
    usage: null,
    async execute({ reply }) {
        reply("Unfortunately latinxia was killed by the Brazilian government in 2023.... ☹️");
    }
});
