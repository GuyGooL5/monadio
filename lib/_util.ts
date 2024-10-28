export type ValueOrFnOnce<T> = T | (() => T);

export const applyValueOrFnOnce = <T>(valueOrFnOnce: ValueOrFnOnce<T>): T =>
	typeof valueOrFnOnce === "function"
		? (valueOrFnOnce as () => T)()
		: valueOrFnOnce;

export type ValueOrMapper<T, U> = U | ((value: T) => U);

export const applyValueOrMapper = <T, U>(
	valueOrMapper: ValueOrMapper<T, U>,
	value: T,
): U =>
	typeof valueOrMapper === "function"
		? (valueOrMapper as (value: T) => U)(value)
		: valueOrMapper;
