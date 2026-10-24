import { fetchJson } from "./fetch";

// API key is taken from the GBoard app on iOS
const TENOR_KEY = "3Z0688EVWYKH";
// API key is taken from the Klipy website
const KLIPY_APP_KEY = "pmpZyPifwSulBfELHCbpaOllUfgsjqt9yeImc2XWIcHSWjnAUBw9oueRf4kD5r25";

export async function lookupTenorURL(url: URL): Promise<string> {
    const match = url.pathname.match(/-(\d+)\/?$/);
    if (!match)
        throw new Error("Invalid Tenor URL");

    const apiUrl = "https://api.tenor.com/v1/gifs?" + new URLSearchParams({
        ids: match[1],
        key: TENOR_KEY,
        media_filter: "minimal"
    });

    const { results } = await fetchJson(apiUrl);
    const gifUrl = results?.[0]?.media?.[0]?.gif?.url;;

    if (!gifUrl)
        throw new Error("GIF not found");

    return gifUrl;
}

export async function lookupKlipyURL(url: URL) {
    const slug = url.pathname.split("/").pop()!;
    if (!slug)
        throw new Error("Invalid Klipy URL");

    const apiUrl = `https://api.klipy.com/api/v1/${KLIPY_APP_KEY}/gifs/items?` + new URLSearchParams({
        slugs: slug
    });

    const { data } = await fetchJson(apiUrl);

    const file = data?.data?.[0]?.file;
    if (!file) throw new Error("Klipy item not found");

    for (const size of ["hd", "md", "sm", "xs"]) {
        const url = file?.[size]?.gif?.url;
        if (url) return url;
    }
    throw new Error("Klipy GIF not found");
}
