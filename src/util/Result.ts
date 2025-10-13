export type Ok<T> = {
    ok: true;
    value: T;
};

export type Err<E> = {
    ok: false;
    error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export const Ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const Err = <E>(error: E): Err<E> => ({ ok: false, error });
