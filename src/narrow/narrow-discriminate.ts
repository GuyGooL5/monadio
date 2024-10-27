type OnlyLiteralPropertyKey<T, K extends keyof T> = T[K] extends PropertyKey
	? number extends T[K]
		? never
		: string extends T[K]
			? never
			: symbol extends T[K]
				? never
				: K
	: never;

type Matcher<T extends object, K extends keyof T, V> = T[K] extends PropertyKey
	? string extends T[K]
		? never
		: number extends T[K]
			? never
			: symbol extends T[K]
				? never
				: {
						[P in T[K]]: (value: T extends { [_ in K]: P } ? T : never) => V;
					}
	: never;

/**
 * NarrowDiscriminate is a utility for narrowing a discriminated union and matching against an object of functions with the same keys as the discriminators.
 *
 * To use this utility, you must provide a discriminated union and the property that discriminates the union.
 * Using the {@linkcode discriminate} factory method, you can create an instance of the utility.
 * The {@linkcode match} method takes an object of functions that match the discriminators and a fallback function that is called when the discriminator does not match any of the keys in the object.
 *
 *
 * **IMPORTANT**: There are some limitations and requirements for using this utility:
 * - The discriminator must be a **literal** that extends {@linkcode PropertyKey}.
 * - The discriminator MUST NOT be of type `string`, `number`, or `symbol`, as these types shadow the literal types.
 * - The discriminator property must be present in all members of the union. If a discriminator property is missing in any member of the union, the property cannot be used as a discriminator.
 * - There might be several discriminator properties in the union, any of which can be used as a discriminator.
 * - A fallback function must be provided to handle cases where the discriminator does not match any of the keys in the object because of potential incorrect type definitions or runtime mismatches.
 *
 * @remarks
 * - This design is inspired by the pattern matching in various functional programming languages.
 * - This utility is fully type-aware and will correctly infer the types of the values passed to the functions in the matcher object.
 *
 * @example
 * ```ts
 * type Shape = { kind: 'circle', radius: number } | { kind: 'square', side: number };
 *
 * declare const shape: Shape;
 *
 * const area = NarrowDiscriminate.discriminate(shape, 'kind').match({
 *  circle: (value) => Math.PI * value.radius ** 2, // the 'value' parameter is correctly inferred as { kind: 'circle', radius: number }
 *  square: (value) => value.side ** 2, // the 'value' parameter is correctly inferred as { kind: 'square', side: number }
 * }, () => 0);
 * ```
 */
export class NarrowDiscriminate<T extends object, K extends keyof T> {
	protected constructor(
		private value: T,
		private discriminator: K,
	) {}

	/**
	 * Creates an instance of the {@linkcode NarrowDiscriminate} utility.
	 *
	 * @param value - The discriminated union to narrow.
	 * @param discriminator - The property that discriminates the union.
	 * @returns An instance of the {@linkcode NarrowDiscriminate} utility.
	 *
	 * @remarks
	 * - The discriminator must be a **literal** that extends {@linkcode PropertyKey}.
	 * - The discriminator MUST NOT be of type `string`, `number`, or `symbol`, as these types shadow the literal types.
	 * - The discriminator property must be present in all members of the union. If a discriminator property is missing in any member of the union, the property cannot be used as a discriminator.
	 * - There might be several discriminator properties in the union, any of which can be used as a discriminator.
	 *
	 */
	static discriminate<T extends object, K extends keyof T>(
		value: T,
		discriminator: OnlyLiteralPropertyKey<T, K>,
	) {
		return new NarrowDiscriminate(value, discriminator);
	}

	/**
	 * Matches the discriminator against the object of functions and returns the result of the matching function.
	 *
	 * @param mapObj - An object of functions that match the discriminators.
	 * @param fallback - A function that is called when the discriminator does not match any of the keys in the object.
	 * @returns The result of the matching function or the result of the fallback function.
	 *
	 * @remarks The fallback function must be provided to handle cases where the discriminator does not match any of the keys in the object because of potential incorrect type definitions or run  time mismatches.
	 */
	match<V>(mapObj: Matcher<T, K, V>, fallback: (value: unknown) => V) {
		const key = this.value[this.discriminator] as T[K] & PropertyKey;
		return (mapObj[key] ?? fallback)(this.value as never);
	}
}
