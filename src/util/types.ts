export type Promiseable<T> = T | Promise<T>;

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P]; };
