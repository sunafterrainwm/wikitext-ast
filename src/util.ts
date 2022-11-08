export type ArrayAble<T> = ArrayLike<T> | T[] | readonly T[] | Iterable<T>;

export function pick<O extends object, K extends keyof O>(object: O, keys: K[]): Pick<O, K> {
	const result: Partial<Pick<O, K>> = {};

	for (const key of keys) {
		result[key] = object[key];
	}

	return result as Pick<O, K>;
}
