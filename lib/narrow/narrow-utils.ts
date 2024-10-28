type StrictNarrow<V, T> = V extends T ? V : never;

/**
 * Checks if a value is an instance of a given class.
 *
 * @param cls - The class to check against.
 * @param value - The value to check.
 * @returns A type predicate function indicating if the value is an instance of the class.
 */
function isInstaceOf<T, U extends T>(
	cls: abstract new (...args: never[]) => U,
) {
	return (value: T): value is U => value instanceof cls;
}

type _function = (...args: never[]) => unknown;

const primitive = Object.freeze({
	/**
	 * A type-guard function that checks if a value is a bigint.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is a bigint.
	 */
	isBigint: <T>(value: T): value is StrictNarrow<T, bigint> =>
		typeof value === "bigint",

	/**
	 * A type-guard function that checks if a value is a boolean.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is a boolean.
	 * */
	isBoolean: <T>(value: T): value is StrictNarrow<T, boolean> =>
		typeof value === "boolean",

	/**
	 * A type-guard function that checks if a value is a function.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is a function.
	 * */
	isFunction: <T>(value: T): value is StrictNarrow<T, _function> =>
		typeof value === "function",

	/**
	 * A type-guard function that checks if a value is a number.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is a number.
	 * */
	isNumber: <T>(value: T): value is StrictNarrow<T, number> =>
		typeof value === "number",

	/**
	 * A type-guard function that checks if a value is an object.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is an object.
	 * */
	isObject: <T>(value: T): value is StrictNarrow<T, object> =>
		typeof value === "object",

	/**
	 * A type-guard function that checks if a value is a string.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is a string.
	 * */
	isString: <T>(value: T): value is StrictNarrow<T, string> =>
		typeof value === "string",

	/**
	 * A type-guard function that checks if a value is a symbol.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is a symbol.
	 * */
	isSymbol: <T>(value: T): value is StrictNarrow<T, symbol> =>
		typeof value === "symbol",

	/**
	 * A type-guard function that checks if a value is undefined.
	 * @param value The value to check.
	 * @returns a type predicate function indicating if the value is undefined.
	 * */
	isUndefined: <T>(value: T): value is StrictNarrow<T, undefined> =>
		typeof value === "undefined",
});

export const utils = Object.freeze({ isInstaceOf, primitive });
