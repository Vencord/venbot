export function sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
}

export function until(ms: number) {
    return new Date(Date.now() + ms).toISOString();
}
