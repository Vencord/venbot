export const Fragment = Symbol("ComponentsJsx.Fragment");

type FunctionComponent = (props: any) => any;

export function createElement(type: typeof Fragment | FunctionComponent, props: any, ...children: any[]) {
    if (type === Fragment) {
        return children;
    }

    props ??= {};
    props.children = children;
    return type(props);
}
