export const Fragment = Symbol("ComponentsJsx.Fragment");

export function createElement(type: typeof Fragment | ((props: any) => any), props: any, ...children: any[]) {
    if (type === Fragment) {
        return children;
    }

    props ??= {};
    props.children = children;
    return type(props);
}
