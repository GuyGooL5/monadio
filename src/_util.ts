export type ValueOrFnOnce<T> = T | (() => T);

export const applyValueOrFnOnce = <T>(valueOrFnOnce: ValueOrFnOnce<T>): T =>
	typeof valueOrFnOnce === "function"
		? (valueOrFnOnce as () => T)()
		: valueOrFnOnce;
