import { fetchGoogle } from "./fetch";
import { toInlineCode } from "./text";

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

interface GoogleData {
    translation: string;
    sourceLanguage: string;
}

export async function translate(text: string, sourceLang: Locale, targetLang: Locale, useProxy = true): Promise<TranslationValue> {
    // Google seems to throttle non-residential IPs, it becomes soooo slow on my VPS without the proxy
    const url = "https://translate-pa.googleapis.com/v1/translate?" + new URLSearchParams({
        "params.client": "gtx",
        "dataTypes": "TRANSLATION",
        "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA", // some google API key
        "query.sourceLanguage": sourceLang,
        "query.targetLanguage": targetLang,
        "query.text": text,
    });

    try {
        const { sourceLanguage, translation }: GoogleData = await fetchGoogle(url).then(res => res.json());

        return {
            src: sourceLanguage,
            text: translation
        };
    } catch (e) {
        if (useProxy) return translate(text, sourceLang, targetLang, false);
        else throw e;
    }
}

export function formatLanguage(code: string) {
    const { flag, name } = GoogleLanguageMap[code as keyof typeof GoogleLanguageMap] || { flag: "🏳️", name: "Unknown Language" };

    return toInlineCode(` ${flag} ${name} `);
}

export const GoogleLanguageMap = {
    "auto": { flag: "🏳️", name: "Auto Detect" },
    "af": { flag: "🇿🇦", name: "Afrikaans" },
    "sq": { flag: "🇦🇱", name: "Albanian" },
    "am": { flag: "🇪🇹", name: "Amharic" },
    "ar": { flag: "🇸🇦", name: "Arabic" },
    "hy": { flag: "🇦🇲", name: "Armenian" },
    "as": { flag: "🇮🇳", name: "Assamese" },
    "ay": { flag: "🇧🇴", name: "Aymara" },
    "az": { flag: "🇦🇿", name: "Azerbaijani" },
    "bm": { flag: "🇲🇱", name: "Bambara" },
    "eu": { flag: "🇪🇸", name: "Basque" },
    "be": { flag: "🇧🇾", name: "Belarusian" },
    "bn": { flag: "🇧🇩", name: "Bengali" },
    "bho": { flag: "🇮🇳", name: "Bhojpuri" },
    "bs": { flag: "🇧🇦", name: "Bosnian" },
    "bg": { flag: "🇧🇬", name: "Bulgarian" },
    "ca": { flag: "🇪🇸", name: "Catalan" },
    "ceb": { flag: "🇵🇭", name: "Cebuano" },
    "ny": { flag: "🇲🇼", name: "Chichewa" },
    "zh-CN": { flag: "🇨🇳", name: "Chinese (Simplified)" },
    "zh-TW": { flag: "🇹🇼", name: "Chinese (Traditional)" },
    "co": { flag: "🇫🇷", name: "Corsican" },
    "hr": { flag: "🇭🇷", name: "Croatian" },
    "cs": { flag: "🇨🇿", name: "Czech" },
    "da": { flag: "🇩🇰", name: "Danish" },
    "dv": { flag: "🇲🇻", name: "Dhivehi" },
    "doi": { flag: "🇮🇳", name: "Dogri" },
    "nl": { flag: "🇳🇱", name: "Dutch" },
    "en": { flag: "🇬🇧", name: "English" },
    "eo": { flag: "🌍", name: "Esperanto" },
    "et": { flag: "🇪🇪", name: "Estonian" },
    "ee": { flag: "🇬🇭", name: "Ewe" },
    "tl": { flag: "🇵🇭", name: "Filipino" },
    "fi": { flag: "🇫🇮", name: "Finnish" },
    "fr": { flag: "🇫🇷", name: "French" },
    "fy": { flag: "🇳🇱", name: "Frisian" },
    "gl": { flag: "🇪🇸", name: "Galician" },
    "ka": { flag: "🇬🇪", name: "Georgian" },
    "de": { flag: "🇩🇪", name: "German" },
    "el": { flag: "🇬🇷", name: "Greek" },
    "gn": { flag: "🇵🇾", name: "Guarani" },
    "gu": { flag: "🇮🇳", name: "Gujarati" },
    "ht": { flag: "🇭🇹", name: "Haitian Creole" },
    "ha": { flag: "🇳🇬", name: "Hausa" },
    "haw": { flag: "🇺🇸", name: "Hawaiian" },
    "iw": { flag: "🇮🇱", name: "Hebrew" },
    "hi": { flag: "🇮🇳", name: "Hindi" },
    "hmn": { flag: "🇨🇳", name: "Hmong" },
    "hu": { flag: "🇭🇺", name: "Hungarian" },
    "is": { flag: "🇮🇸", name: "Icelandic" },
    "ig": { flag: "🇳🇬", name: "Igbo" },
    "ilo": { flag: "🇵🇭", name: "Ilocano" },
    "id": { flag: "🇮🇩", name: "Indonesian" },
    "ga": { flag: "🇮🇪", name: "Irish" },
    "it": { flag: "🇮🇹", name: "Italian" },
    "ja": { flag: "🇯🇵", name: "Japanese" },
    "jw": { flag: "🇮🇩", name: "Javanese" },
    "kn": { flag: "🇮🇳", name: "Kannada" },
    "kk": { flag: "🇰🇿", name: "Kazakh" },
    "km": { flag: "🇰🇭", name: "Khmer" },
    "rw": { flag: "🇷🇼", name: "Kinyarwanda" },
    "gom": { flag: "🇮🇳", name: "Konkani" },
    "ko": { flag: "🇰🇷", name: "Korean" },
    "kri": { flag: "🇸🇱", name: "Krio" },
    "ku": { flag: "🇹🇷", name: "Kurdish" },
    "ckb": { flag: "🇮🇶", name: "Kurdish (Sorani)" },
    "ky": { flag: "🇰🇬", name: "Kyrgyz" },
    "lo": { flag: "🇱🇦", name: "Lao" },
    "la": { flag: "🏛️", name: "Latin" },
    "lv": { flag: "🇱🇻", name: "Latvian" },
    "ln": { flag: "🇨🇩", name: "Lingala" },
    "lt": { flag: "🇱🇹", name: "Lithuanian" },
    "lg": { flag: "🇺🇬", name: "Luganda" },
    "lb": { flag: "🇱🇺", name: "Luxembourgish" },
    "mk": { flag: "🇲🇰", name: "Macedonian" },
    "mai": { flag: "🇮🇳", name: "Maithili" },
    "mg": { flag: "🇲🇬", name: "Malagasy" },
    "ms": { flag: "🇲🇾", name: "Malay" },
    "ml": { flag: "🇮🇳", name: "Malayalam" },
    "mt": { flag: "🇲🇹", name: "Maltese" },
    "mi": { flag: "🇳🇿", name: "Maori" },
    "mr": { flag: "🇮🇳", name: "Marathi" },
    "mni-Mtei": { flag: "🇮🇳", name: "Meitei (Manipuri)" },
    "lus": { flag: "🇮🇳", name: "Mizo" },
    "mn": { flag: "🇲🇳", name: "Mongolian" },
    "my": { flag: "🇲🇲", name: "Myanmar (Burmese)" },
    "ne": { flag: "🇳🇵", name: "Nepali" },
    "no": { flag: "🇳🇴", name: "Norwegian" },
    "or": { flag: "🇮🇳", name: "Odia (Oriya)" },
    "om": { flag: "🇪🇹", name: "Oromo" },
    "ps": { flag: "🇦🇫", name: "Pashto" },
    "fa": { flag: "🇮🇷", name: "Persian" },
    "pl": { flag: "🇵🇱", name: "Polish" },
    "pt": { flag: "🇵🇹", name: "Portuguese" },
    "pa": { flag: "🇮🇳", name: "Punjabi" },
    "qu": { flag: "🇵🇪", name: "Quechua" },
    "ro": { flag: "🇷🇴", name: "Romanian" },
    "ru": { flag: "🇷🇺", name: "Russian" },
    "sm": { flag: "🇼🇸", name: "Samoan" },
    "sa": { flag: "🇮🇳", name: "Sanskrit" },
    "gd": { flag: "🏴", name: "Scots Gaelic" },
    "nso": { flag: "🇿🇦", name: "Sepedi" },
    "sr": { flag: "🇷🇸", name: "Serbian" },
    "st": { flag: "🇱🇸", name: "Sesotho" },
    "sn": { flag: "🇿🇼", name: "Shona" },
    "sd": { flag: "🇵🇰", name: "Sindhi" },
    "si": { flag: "🇱🇰", name: "Sinhala" },
    "sk": { flag: "🇸🇰", name: "Slovak" },
    "sl": { flag: "🇸🇮", name: "Slovenian" },
    "so": { flag: "🇸🇴", name: "Somali" },
    "es": { flag: "🇪🇸", name: "Spanish" },
    "su": { flag: "🇮🇩", name: "Sundanese" },
    "sw": { flag: "🇰🇪", name: "Swahili" },
    "sv": { flag: "🇸🇪", name: "Swedish" },
    "tg": { flag: "🇹🇯", name: "Tajik" },
    "ta": { flag: "🇮🇳", name: "Tamil" },
    "tt": { flag: "🇷🇺", name: "Tatar" },
    "te": { flag: "🇮🇳", name: "Telugu" },
    "th": { flag: "🇹🇭", name: "Thai" },
    "ti": { flag: "🇪🇷", name: "Tigrinya" },
    "ts": { flag: "🇿🇦", name: "Tsonga" },
    "tr": { flag: "🇹🇷", name: "Turkish" },
    "tk": { flag: "🇹🇲", name: "Turkmen" },
    "ak": { flag: "🇬🇭", name: "Twi" },
    "uk": { flag: "🇺🇦", name: "Ukrainian" },
    "ur": { flag: "🇵🇰", name: "Urdu" },
    "ug": { flag: "🇨🇳", name: "Uyghur" },
    "uz": { flag: "🇺🇿", name: "Uzbek" },
    "vi": { flag: "🇻🇳", name: "Vietnamese" },
    "cy": { flag: "🏴", name: "Welsh" },
    "xh": { flag: "🇿🇦", name: "Xhosa" },
    "yi": { flag: "🇮🇱", name: "Yiddish" },
    "yo": { flag: "🇳🇬", name: "Yoruba" },
    "zu": { flag: "🇿🇦", name: "Zulu" }
} satisfies Record<Locale, any>;
