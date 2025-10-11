const isFalseOrNullish = (value: any) => value === false || value == null;
const isNotFalseOrNullish = (value: any) => !isFalseOrNullish(value);

export function transformChildrenArray(children: any[]) {
    return children.flat(Infinity).filter(isNotFalseOrNullish);
}

export function childrenToString(name: string, children: any) {
    if (Array.isArray(children)) {
        return transformChildrenArray(children).join("");
    }
    if (typeof children === "string") {
        return children;
    }
    if (isFalseOrNullish(children)) {
        return null;
    }
    throw new Error(`${name} children must be a string or an array of strings`);
}

export function childrenToArray(children: any) {
    if (Array.isArray(children)) {
        return transformChildrenArray(children);
    }
    if (isFalseOrNullish(children)) {
        return [];
    }
    return [children];
}

export function singleChild(name: string, children: any) {
    if (!Array.isArray(children) || children.length !== 1) {
        throw new Error(`${name} must have exactly one child`);
    }

    return children[0];
}
