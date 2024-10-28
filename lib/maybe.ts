import { type ValueOrFnOnce, applyValueOrFnOnce } from "./_util";
import { MissingValueError } from "./errors";
import { Pipe } from "./pipe";
import { Result } from "./result";

type RawMaybe<T> = T | null | undefined;
/**
 * The `Maybe` class is a monad that represents an optional value.
 * It is used safely handle nullable values without explicit null checks.
 *
 * The `Maybe` class provides a set of functional methods to safely manipulate the wrapped value.
 *
 * @remarks The `Maybe` class is inspired by the `Option` type in Rust.
 *
 * To create a `Maybe` instance, you can use the following factory methods:
 * - {@link Maybe.None} to create a `Maybe` instance that wraps a null value.
 * ```typescript
 * const maybeNone: Maybe<number> = Maybe.None();
 * ```
 * ---
 * - {@link Maybe.Some} to create a `Maybe` instance that wraps a non-null value.
 * ```typescript
 * const maybeNumber: Maybe<number> = Maybe.Some(42);
 * ```
 * ---
 * - {@link Maybe.from} to create a `Maybe` instance from any value that can be null or undefined, or an existing `Maybe` instance.
 * ```typescript
 * const maybe1 = Maybe.from(42);
 * // 	^? Maybe<number>
 * const maybe2 = Maybe.from(Maybe.Some(42));
 * // 	^? Maybe<number>
 * declare const loggedInUser: User | null;
 * const maybeUser = Maybe.from(loggedInUser);
 * // 	^? Maybe<User>
 * ```
 * ---
 * - {@link Maybe.try} to create a `Maybe` instance from a function that may throw an error, in which case the returned instance will wrap a null value.
 * ```typescript
 * const maybeNumber = Maybe.try(() => {
 * 	if (Math.random() > 0.5) return 42;
 * 	throw new Error("Failed to generate a number");
 * });
 * // 	^? Maybe<number>
 * ```
 * ---
 * - {@link Maybe.narrow} to create a `Maybe` instance from a value and a narrowing function that checks if the value is of a specific type.
 * ```typescript
 * type AllUsers = "admin" | "user" | "guest";
 * type LoggedInUser = "admin" | "user";
 * declare const userRole: AllUsers;
 * const maybeLoggedInUser = Maybe.narrow(userRole, (role): role is LoggedInUser => role === "admin" || role === "user");
 * // 	^? Maybe<LoggedInUser>
 * ```
 * ---
 * - {@link Maybe.combine} to create a `Maybe` instance from multiple `Maybe` instances.
 * ```typescript
 * const maybeNumber = Maybe.Some(42);
 * const maybeString = Maybe.Some("hello");
 * const maybeBoolean = Maybe.Some(true);
 * const maybeCombined = Maybe.combine(maybeNumber, maybeString, maybeBoolean);
 * // 	^? Maybe<[number, string, boolean]>
 * ```
 * ---
 */
export class Maybe<T> {
	protected readonly value: T | null;
	private constructor(value: RawMaybe<T>) {
		this.value = value ?? null;
	}

	/**
	 * Creates a Maybe instance that wraps a null value
	 * @template T if not provided, the returned instance will be `Maybe<never>` as it wraps a null value.
	 * You can specify the type of the wrapped to comply with further operations.
	 * @returns A Maybe instance that wraps a null value.
	 * @example
	 * const maybeNone = Maybe.None<number>();
	 * // 	^? Maybe<number>
	 */
	static None<T = never>(): Maybe<T> {
		return new Maybe<T>(null);
	}

	/**
	 * Creates a Maybe instance that wraps a non-null value
	 * @template T - the type of the value to wrap
	 * @param value - the value to wrap (cannot be explicitly null or undefined)
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * // 	^? Maybe<number>
	 */
	static Some<T>(value: NonNullable<T>): Maybe<T> {
		return new Maybe(value);
	}

	/**
	 * Creates a Maybe instance from a value that can be null or undefined, or an existing Maybe instance
	 * @template T - the type of the (wrapped) value to hydrate
	 * @param value - the value to hydrate (can be a Maybe instance)
	 * @returns a Maybe instance
	 *
	 * @remarks if `T` is a union type of some value and `null` or `undefined`, the returned instace will remove the nullish values from the generic `T`
	 * @remarks if `value` is already a Maybe instance, it will be returned as is
	 * @remarks if `value` is is typed *only* as `null` or `undefined`, the returned instance will be `Maybe<never>`
	 *
	 * @example
	 * const maybe1 = Maybe.from(42);
	 * // 	^? Maybe<number>
	 * const maybe2 = Maybe.from(null);
	 * // 	^? Maybe<never>
	 * const maybe2 = Maybe.from(Maybe.Some(42));
	 * // 	^? Maybe<number>
	 * const maybe4 = Maybe.from(Maybe.None());
	 * // 	^? Maybe<never>
	 * declare const user: User | null;
	 * const maybeUser = Maybe.from(user);
	 * // 	^? Maybe<User>
	 */
	static from<T>(value: RawMaybe<T> | Maybe<T>): Maybe<NonNullable<T>> {
		return (value instanceof Maybe ? value : new Maybe(value)) as never;
	}

	/**
	 * Creates a Maybe instance from a function that may throw an error
	 * @template T - the type of the value to wrap
	 * @param wrappedFn - the function to execute
	 * @returns a Maybe instance that wraps the return value of the function
	 *
	 * @remarks if the function throws an error, the returned instance will wrap a null value
	 *
	 * @example
	 * const maybeNumber = Maybe.try(() => {
	 * 	if (Math.random() > 0.5) return 42;
	 * 	throw new Error("Failed to generate a number");
	 * });
	 * // 	^? Maybe<number>
	 */
	static try<T>(wrappedFn: () => RawMaybe<T> | Maybe<T>): Maybe<T> {
		try {
			return Maybe.from(wrappedFn());
		} catch (_) {
			return Maybe.None();
		}
	}

	/**
	 * Creates a Maybe instance from a value and a narrowing function that checks if the value is of a specific type
	 * @template T - the type of the value to wrap
	 * @template U - the type to narrow to
	 * @param value - the value to wrap
	 * @param narrowFn - the narrowing function
	 * @returns a Maybe instance that wraps the value if the narrowing function returns true, otherwise wraps a null value
	 *
	 * @example
	 * type AllUsers = "admin" | "user" | "guest";
	 * type LoggedInUser = "admin" | "user";
	 * declare const userRole: AllUsers;
	 * const maybeLoggedInUser = Maybe.narrow(userRole, (role): role is LoggedInUser => role === "admin" || role === "user");
	 * // 	^? Maybe<LoggedInUser>
	 */
	static narrow<T, U extends T>(
		value: T,
		narrowFn: (value: T) => value is NonNullable<U>,
	): Maybe<U> {
		return Maybe.from(value).narrow(narrowFn);
	}

	narrow<U extends NonNullable<T>>(
		narrowFn: (value: T) => value is U,
	): Maybe<U> {
		return this.andThen((value) =>
			narrowFn(value) ? Maybe.Some(value) : Maybe.None(),
		);
	}

	/**
	 * Creates a Maybe instance from multiple Maybe instances (or rwa nullable values)
	 * @template T - the type of the values to combine
	 * @param maybes - the Maybe instances to combine
	 * @returns a Maybe instance that wraps an array of the values of the input Maybe instances
	 *
	 * @remarks if any of the input Maybe instances wraps a null value, the returned instance will wrap a null value
	 *
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const maybeString = Maybe.Some("hello");
	 * const maybeBoolean = Maybe.Some(true);
	 * const maybeCombined = Maybe.combine(maybeNumber, maybeString, maybeBoolean);
	 * // 	^? Maybe<[number, string, boolean]>
	 */
	static combine<T extends (RawMaybe<unknown> | Maybe<unknown> | undefined)[]>(
		...maybes: T
	) {
		const rawValues = maybes.map((m) => (m instanceof Maybe ? m.value : m));
		return (
			rawValues.includes(null) || rawValues.includes(undefined)
				? Maybe.from(null)
				: Maybe.from(rawValues)
		) as Maybe<{
			[K in keyof T]: T[K] extends Maybe<infer U>
				? U
				: T[K] extends RawMaybe<infer U> | undefined
					? U
					: never;
		}>;
	}

	/**
	 * Returns whether the Maybe instance wraps a non-null value
	 * @returns `true` if the Maybe instance wraps a non-null value, otherwise `false`
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * maybeNumber.isSome();
	 * // 	^? true
	 */
	public isSome(): boolean {
		return this.value !== null;
	}

	/**
	 * Returns whether the Maybe instance wraps a null value
	 * @returns `true` if the Maybe instance wraps a null value, otherwise `false`
	 * @example
	 * const maybeNone = Maybe.None();
	 * maybeNone.isNone();
	 * // 	^? true
	 */
	public isNone(): boolean {
		return this.value === null;
	}

	/**
	 * Maps the wrapped value to a new value (if present)
	 * @template U - the type of the new value
	 * @param mapFn - the mapping function
	 * @returns a new Maybe instance that wraps the new value
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const maybeString = maybeNumber.map(String);
	 * // 	^? Maybe<string>
	 */
	public map<U>(mapFn: (data: T) => U): Maybe<U> {
		return Maybe.from<U>(this.value !== null ? mapFn(this.value) : null);
	}

	/**
	 * Safely unwraps the Maybe instance to get the wrapped value or a default value if the Maybe instance wraps a null value
	 * @param defaultValue - the default value or a function that returns the default value
	 * @returns the wrapped value if present, otherwise the default value
	 *
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * console.log(maybeNumber.unwrap(0)); // 42
	 *
	 * const maybeNone = Maybe.None<number>();
	 * console.log(maybeNone.unwrap(0)); // 0
	 */
	public unwrap(defaultValue: ValueOrFnOnce<T>): T {
		return this.value ?? applyValueOrFnOnce(defaultValue);
	}

	/**
	 * Unwraps the Maybe instance to get the wrapped value or throws a {@link MissingValueError} if the Maybe instance wraps a null value
	 * @returns the wrapped value if present
	 * @throws a {@link MissingValueError} if the Maybe instance wraps a null value
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * console.log(maybeNumber.unwrapUnsafe()); // 42
	 *
	 * const maybeNone = Maybe.None<number>();
	 * maybeNone.unwrapUnsafe(); // throws MissingValueError
	 */
	public unwrapUnsafe(): T {
		if (this.value == null) throw new MissingValueError();
		return this.value;
	}

	/**
	 * Maps the wrapped value to a new value (if present) or returns a default value
	 * @remarks This method is a convenient combination of {@link map} and {@link unwrap}
	 * @template U - the type of the new value
	 * @param defaultValue - the default value or a function that returns the default value
	 * @param mapFn - the mapping function
	 * @returns the new value if the Maybe instance wraps a non-null value, otherwise the default value
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const mappedNumber = maybeNumber.mapOr(0, String);
	 * // 	^? string
	 */
	public mapOr<U>(defaultValue: ValueOrFnOnce<U>, mapFn: (data: T) => U): U {
		return this.value == null
			? applyValueOrFnOnce(defaultValue)
			: mapFn(this.value);
	}

	/**
	 * Maps the wrapped value (if present) to a new `Maybe` instance or a nullable value that will be wrapped in a Maybe.
	 * @remarks This method is useful for chaining operations that may return nullable values.
	 * @param nextMaybe - the mapping function that returns a nullable value
	 * @returns a new Maybe instance that wraps the new value
	 *
	 * @example
	 * declare function getUser(id: number): User | null;
	 * declare function getMaybeUser(id: number): Maybe<User>;
	 *
	 * const maybeUserId = Maybe.Some(42);
	 * // 	^? Maybe<number>
	 * const maybeUser1 = maybeUserId.andThen(getUser);
	 * // 	^? Maybe<User>
	 * const maybeUser2 = maybeUserId.andThen(getMaybeUser);
	 * // 	^? Maybe<User>
	 */
	public andThen<U>(nextMaybe: (data: T) => RawMaybe<U> | Maybe<U>): Maybe<U> {
		return this.value == null
			? Maybe.None()
			: Maybe.from(nextMaybe(this.value));
	}

	/**
	 * Replace the current Maybe instance with a new Maybe instance if the current instance wraps a null value
	 * @remarks The new Maybe instance must wrap the same type of value to prevent ambiguity
	 * @param nextMaybe - the new Maybe instance or a function that returns the new Maybe instance
	 * @returns the current Maybe instance if it wraps a non-null value, otherwise the new Maybe instance
	 *
	 * @example
	 * const maybeFallback = Maybe.Some(24);
	 *
	 * const maybeNumber1 = Maybe.Some(42);
	 * console.log(maybeNumber1.orElse(maybeFallback).unwrap(0)); // 42
	 *
	 * const maybeNumber2 = Maybe.None<number>();
	 * console.log(maybeNumber2.orElse(maybeFallback).unwrap(0)); // 24
	 *
	 * console.log(maybeNumber2.orElse(Maybe.None()).unwrap(0)); // 0
	 */
	public orElse(nextMaybe: ValueOrFnOnce<RawMaybe<T> | Maybe<T>>): Maybe<T> {
		return Maybe.from(
			this.value == null ? applyValueOrFnOnce(nextMaybe) : this.value,
		);
	}

	/**
	 * Flatten nested Maybe instances. If the current Maybe instance wraps a Maybe instance, it will be replaced with the wrapped Maybe instance.
	 *
	 * @remarks This method is only available if the wrapped value {@link T} is a Maybe instance.
	 * @returns a new Maybe instance that wraps the unwrapped value
	 * @example
	 * const maybeMaybeNumber = Maybe.Some(Maybe.Some(42));
	 * // 	^? Maybe<Maybe<number>>
	 *
	 * const maybeNumber = maybeMaybeNumber.flatten();
	 * // 	^? Maybe<number>
	 * console.log(maybeNumber.unwrap(0)); // 42
	 *
	 * const maybeMaybeNone = Maybe.None<Maybe<number>>();
	 * // 	^? Maybe<Maybe<number>>
	 * const maybeNone = maybeMaybeNone.flatten();
	 * // 	^? Maybe<number>
	 * console.log(maybeNone.unwrap(0)); // 0
	 *
	 * const notNestedMaybe = Maybe.Some(42);
	 * // 	^? Maybe<number>
	 * notNestedMaybe.flatten(); // this is a compile type error
	 */
	flatten: T extends Maybe<infer U> ? () => Maybe<U> : never = (() => {
		return Maybe.from(this.value);
	}) as never;

	/**
	 * This methods runs a callback function on the wrapped value (ONLY IF PRESENT) to perform a side effect.
	 *
	 * **Note:** The effect function should not mutate the wrapped value and should not return any value (as it will be ignored).
	 * @param effectFn - the callback function to run on the wrapped value (if present)
	 * @returns the current Maybe instance after running the effect function
	 * @remarks if you want to run an effect on a null value, use {@link effectOnNone}
	 * @example
	 * Maybe.Some(42).effectOnSome((value) => localStorage.setItem("value", String(value))); // this will be executed
	 * Maybe.None<number>().effectOnSome((value) => localStorage.setItem("value", String(value))); // this will not be executed
	 */
	public effectOnSome(effectFn: (data: Readonly<T>) => void): this {
		if (this.value != null) effectFn(this.value);
		return this;
	}

	/**
	 * This methods runs a callback function on the wrapped value (ONLY IF ABSENT) to perform a side effect.
	 *
	 * **Note:** The effect function should not mutate the wrapped value and should not return any value (as it will be ignored).
	 * @param effectFn - the callback function to run on the wrapped value (if absent)
	 * @returns the current Maybe instance after running the effect function
	 * @remarks if you want to run an effect on a non-null value, use {@link effectOnSome}
	 * @example
	 * Maybe.Some(42).effectOnNone(() => console.warn("No value")); // this will not be executed
	 * Maybe.None<number>().effectOnNone(() => console.warn("No value")); // this will be executed
	 */
	public effectOnNone(fn: () => void): this {
		if (this.value == null) fn();
		return this;
	}

	/**
	 * Dump is a method that returns the wrapped value or null if the value is absent.
	 * @returns the wrapped value or null if the value is absent
	 * @remarks This method is basically retrieving the value as is (`T | null`)
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const value = maybeNumber.dump();
	 * // 	^? number | null
	 * console.log(value); // 42
	 *
	 * const maybeNone = Maybe.None<number>();
	 * const value = maybeNone.dump();
	 * // 	^? number | null
	 * console.log(value); // null
	 */
	public dump(): T | null {
		return this.value;
	}

	/**
	 * Converts the Maybe instance to a {@link Result} instance that wraps the value or a {@link MissingValueError} if the Maybe instance wraps a null value
	 * @returns a Result instance that wraps the value or a MissingValueError
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const resultNumber = maybeNumber.intoResult();
	 * // 	^? Result<number, MissingValueError>
	 * console.log(resultNumber.unwrapUnsafe()); // 42
	 *
	 * const maybeNone = Maybe.None<number>();
	 * const resultNone = maybeNone.intoResult();
	 * // 	^? Result<number, MissingValueError>
	 * console.log(resultNone.unwrapErr().message); // "Unwrapped a Maybe with no value"
	 */
	public intoResult(): Result<T, MissingValueError>;

	/**
	 * Converts the Maybe instance to a {@link Result} instance that wraps the value or a custom error if the Maybe instance wraps a null value
	 * @template E - the type of the error
	 * @param error - the error or a function that returns the error
	 * @returns a Result instance that wraps the value or the error
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const resultNumber = maybeNumber.intoResult(()=> new Error("No value"));
	 * // 	^? Result<number, Error>
	 * console.log(resultNumber.unwrapUnsafe()); // 42
	 *
	 * const maybeNone = Maybe.None<number>();
	 * const resultNone = maybeNone.intoResult(()=> new Error("No value"));
	 * // 	^? Result<number, Error>
	 * console.log(resultNone.unwrapErr().message); // "No value"
	 */
	public intoResult<E>(error: ValueOrFnOnce<E>): Result<T, E>;
	public intoResult<E>(
		error?: ValueOrFnOnce<E>,
	): Result<T, E | MissingValueError> {
		return this.mapOr(
			Result.Err(error ? applyValueOrFnOnce(error) : new MissingValueError()),
			Result.Ok,
		);
	}

	/**
	 * Converts the Maybe instance to a {@link Pipe} instance that wraps the raw (dumped) value.
	 * @returns a Pipe instance that wraps the value or a null value
	 * @remarks This is the equivalent of calling {@link Pipe.create} with {@link Maybe.dump} `Pipe.create(maybe.dump())`
	 *
	 * @example
	 * const maybeNumber = Maybe.Some(42);
	 * const pipeNumber = maybeNumber.intoPipe();
	 * // 	^? Pipe<number | null>
	 */
	public intoPipe(): Pipe<T | null> {
		return Pipe.create(this.value);
	}
}
