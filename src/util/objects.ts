export const nullPrototype = <T>(obj: T): T => Object.assign(Object.create(null), obj);
export const makeConstants = <T>(obj: T): Readonly<T> => Object.freeze(nullPrototype(obj));
