import { Millis } from "~/constants";
import { sleep } from "~/util/time";

export async function tryWithBackoff(
    fn: () => boolean | Promise<boolean>,
    minimumDelayMs: number = Millis.SECOND,
    maxDelayMs: number = Millis.MINUTE
) {
    let delay = minimumDelayMs;
    while (true) {
        if (await fn()) return true;

        await sleep(delay);
        delay = Math.min(delay * 2, maxDelayMs);
    }
}
