export const enum AnsiTextFormat {
    Normal = 0,
    Bold = 1,
    Underline = 4,
}

export const enum AnsiTextColor {
    Gray = 30,
    Red = 31,
    Green = 32,
    Yellow = 33,
    Blue = 34,
    Pink = 35,
    Cyan = 36,
    White = 37
}

export const enum AnsiBackgroundColor {
    FireflyDarkBlue = 40,
    Orange = 41,
    MarbleBlue = 42,
    GreyishTurquoise = 43,
    Gray = 44,
    Indigo = 45,
    LightGray = 46,
    White = 47
}

const toAnsi = (...codes: [number] | [number, number]) => `\u001b[${codes.join(";")}m`;
const RESET = toAnsi(0);

export function ansiFormatText(s: string, color?: AnsiTextColor | AnsiBackgroundColor, format: AnsiTextFormat = AnsiTextFormat.Normal) {
    const fmt = color
        ? toAnsi(format, color)
        : toAnsi(format);

    return fmt + s + RESET;
}
