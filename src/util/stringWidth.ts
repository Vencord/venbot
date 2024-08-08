// https://github.com/sindresorhus/string-width/tree/v5.1.2 minus the bloat
// SPDX-License-Identifier: MIT
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

const emojiRegex = /\p{RGI_Emoji}/v;

export default function stringWidth(string) {
    if (typeof string !== "string" || string.length === 0) {
        return 0;
    }

    string = string.replace(emojiRegex, "  ");
    let width = 0;

    for (const character of string) {
        const codePoint = character.codePointAt(0);

        // Ignore control characters
        if (codePoint <= 0x1F || (codePoint >= 0x7F && codePoint <= 0x9F)) {
            continue;
        }

        // Ignore combining characters
        if (codePoint >= 0x300 && codePoint <= 0x36F) {
            continue;
        }

        width++;
    }

    return width;
}
