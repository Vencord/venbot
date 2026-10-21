import Tesseract, { createScheduler, createWorker, Scheduler } from "tesseract.js";

const OCR_TIMEOUT_MS = 30_000;

let schedulerPromise: Promise<Scheduler> | null = null;

async function initScheduler() {
    const newScheduler = createScheduler();

    await Promise.all(Array.from({ length: 3 }, async () => {
        const worker = await createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
            cachePath: "./data/tesscache",
            errorHandler: e => console.error("Tesseract worker error:", e)
        });
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$.:/ ",
        });
        newScheduler.addWorker(worker);
    }));

    return newScheduler;
}

function getScheduler() {
    schedulerPromise ??= initScheduler().catch(err => {
        schedulerPromise = null;
        throw err;
    });

    return schedulerPromise;
}

export async function readTextFromImage(image: Buffer): Promise<string> {
    const scheduler = await getScheduler();

    let timeout: NodeJS.Timeout | undefined;
    try {
        const result = await Promise.race([
            scheduler.addJob("recognize", image),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error("OCR job timed out")), OCR_TIMEOUT_MS);
            })
        ]);

        return result.data.text.replace(/\s+/g, " ").trim();
    } catch (e) {
        if (e instanceof Error && e.message === "OCR job timed out") {
            schedulerPromise = null;
            void scheduler.terminate().catch(() => { });
        }

        throw e;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
