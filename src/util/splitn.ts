export function splitn(s: string, delim: string, limit: number) {
    const res = [] as string[];
    let lastIndex = 0;
    for (let i = 0; i < limit - 1; i++) {
        const index = s.indexOf(delim, lastIndex);
        if (index === -1) break;

        res.push(s.slice(lastIndex, index));
        lastIndex = index + delim.length;
    }

    res.push(s.slice(lastIndex));
    return res;
}
