export function toHexColorString(color: number): string {
    return "#" + color.toString(16).padStart(6, "0");
}

export function randomHexColor(): string {
    return toHexColorString(Math.floor(Math.random() * (0xffffff + 1)));
}
