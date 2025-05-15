interface TranslationData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
    }[];
}

export interface TranslationValue {
    src: string;
    text: string;
}

export type Locale = "auto" | "af" | "sq" | "am" | "ar" | "hy" | "as" | "ay" | "az" | "bm" | "eu" | "be" | "bn" | "bho" | "bs" | "bg" | "ca" | "ceb" | "ny" | "zh-CN" | "zh-TW" | "co" | "hr" | "cs" | "da" | "dv" | "doi" | "nl" | "en" | "eo" | "et" | "ee" | "tl" | "fi" | "fr" | "fy" | "gl" | "ka" | "de" | "el" | "gn" | "gu" | "ht" | "ha" | "haw" | "iw" | "hi" | "hmn" | "hu" | "is" | "ig" | "ilo" | "id" | "ga" | "it" | "ja" | "jw" | "kn" | "kk" | "km" | "rw" | "gom" | "ko" | "kri" | "ku" | "ckb" | "ky" | "lo" | "la" | "lv" | "ln" | "lt" | "lg" | "lb" | "mk" | "mai" | "mg" | "ms" | "ml" | "mt" | "mi" | "mr" | "mni-Mtei" | "lus" | "mn" | "my" | "ne" | "no" | "or" | "om" | "ps" | "fa" | "pl" | "pt" | "pa" | "qu" | "ro" | "ru" | "sm" | "sa" | "gd" | "nso" | "sr" | "st" | "sn" | "sd" | "si" | "sk" | "sl" | "so" | "es" | "su" | "sw" | "sv" | "tg" | "ta" | "tt" | "te" | "th" | "ti" | "ts" | "tr" | "tk" | "ak" | "uk" | "ur" | "ug" | "uz" | "vi" | "cy" | "xh" | "yi" | "yo" | "zu";

export async function translate(text: string, sourceLang: Locale, targetLang: Locale): Promise<TranslationValue> {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        // see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
        // source language
        sl: sourceLang,
        // target language
        tl: targetLang,
        // what to return, t = translation probably
        dt: "t",
        // Send json object response instead of weird array
        dj: "1",
        source: "input",
        // query, duh
        q: text
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(
            `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
            + `\n${res.status} ${res.statusText}`
        );

    const { src, sentences } = await res.json() as TranslationData;

    return {
        src,
        text: sentences.
            map(s => s?.trans).
            filter(Boolean).
            join("")
    };
}
