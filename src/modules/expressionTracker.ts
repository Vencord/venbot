import { Vaius } from "~/Client";

Vaius.on("messageCreate", msg => {
    if (msg.author.bot || !msg.inCachedGuildChannel()) return;

    if (false) { }
});
