import { AnyTextableGuildChannel, Message } from "oceanic.js";
import { reply } from "~/util/discord";
import { silently } from "~/util/functions";
import { handleError } from "~/index";
import { Millis } from "~/constants";
import { until } from "~/util/time";

const TESSIE_ID = "1081940449717133374";

export async function lobotomiseMaybe(msg: Message<AnyTextableGuildChannel>) {
    if (msg.author.id !== TESSIE_ID || !msg.referencedMessage || msg.content !== "mods crush this person's skull") return false;

    try {
        await msg.referencedMessage.member!.edit({
            communicationDisabledUntil: until(10 * Millis.MINUTE),
            reason: "showing screenshot of automodded message"
        });

        silently(msg.referencedMessage.delete());

        silently(reply(msg, {
            content: "Lobotomised! 🔨"
        }));

        return true;
    } catch (e) {
        handleError(`Failed to lobotomise ${msg.referencedMessage.member?.id}`, e);
        return false;
    }
}
