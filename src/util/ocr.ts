import Tesseract, { createScheduler, createWorker, Scheduler } from "tesseract.js";

let scheduler: Scheduler | null = null;

async function initScheduler() {
    if (scheduler) return;
    const newScheduler = createScheduler();

    await Promise.all(Array.from({ length: 3 }, async () => {
        const worker = await createWorker("eng", Tesseract.OEM.LSTM_ONLY, { cachePath: "./data/tesscache" });
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$.:/ ",
        });
        newScheduler.addWorker(worker);
    }));

    scheduler = newScheduler;
}

export async function readTextFromImage(image: Buffer): Promise<string> {
    if (!scheduler) await initScheduler();

    const { data: { text } } = await scheduler!.addJob("recognize", image);

    return text.replace(/\s+/g, " ").trim();
}
