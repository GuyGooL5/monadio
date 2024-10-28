import { type ValueOrMapper, applyValueOrMapper } from "../_util";
import { NarrowError } from "../errors";

type NarrowSwitchState<T, V> =
	| { done: false; value: T }
	| { done: true; result: V };

/**
 * This class is used to create a type-safe switch-like structure that allows you to narrow the type of a value and map it to a new type in a functional way.
 * This class is designed to work with type-predicates and type-guards to narrow the type of the value and map it to a new type.
 * @template TIn - The type of the value original value.
 * @template TNarrowed - The type of the value after narrowing.
 * @template TOut - The type of the value after mapping a narrowed case.
 *
 * To create a new instance of the NarrowSwitch class, use the static factory method {@link NarrowSwitch.switch}.
 */
export class NarrowSwitch<TIn, TNarrowed extends TIn, TOut = never> {
	private constructor(private state: NarrowSwitchState<TNarrowed, TOut>) {}

	/**
	 * This method is used to create a new instance of the NarrowSwitch class with the given value.
	 * @param value The value to use for the new instance.
	 * @returns A new instance of the NarrowSwitch class with the given value.
	 * @template T The type of the value.
	 *
	 * @example
	 * ```typescript
	 * declare const value: User | Admin | Guest;
	 * const narrowSwitch = NarrowSwitch.switch(value);
	 * //   ^? NarrowSwitch<User | Admin | Guest, User | Admin | Guest, never>
	 * ```
	 */
	static switch<T>(value: T) {
		return new NarrowSwitch<T, T>({ done: false, value });
	}

	/**
	 * This method is used to narrow and map the value of the state if the value is of the given type.
	 * It is a builder method that returns a new instance of the NarrowSwitch class with the mapped value added to the result union, and the type of the value excluded from the narrowed type.
	 * @remarks `.case(...)` can be chained multiple times until the value is either:
	 * - exhaustively narrowed (leaving `never` as the narrowed type), allowing the use of {@link exhaust}
	 * - terminated with a {@link default} method before exhasution to provide a fallback value or a fallback function that can map the remaining un-narrowed value.
	 *
	 * @param narrowFn - The narrowing function to apply to the current value wrapped.
	 * @param mapFn - The mapping function to apply to the value as it is narrowed.
	 *
	 * @returns A new instance of the NarrowSwitch class with the narrowed type excluded and the mapped value added to the result union.
	 *
	 * @template U - The type to narrow to.
	 * @template V - The type of the mapped value.
	 *
	 * @example
	 * ```typescript
	 * type User = { role: "user", name: string };
	 * type Admin = { role: "admin", name: string, permissions: string[] };
	 * type Guest = { role: "guest" };
	 *
	 * declare const value: User | Admin | Guest;
	 * const narrowSwitch = NarrowSwitch.switch(value);
	 * const userPermissions = narrowSwitch.case(
	 *  (value): value is User => value.role === "user"
	 *  (value) => ["read", "write"]
	 * ).case(
	 *  // The narrowFn below already knows to exclude the User type as it was consumed in the previous case.
	 *  (value): value is Admin => value.role === "admin"
	 *  (value) => ["read", "write", ...value.permissions]
	 * ).case(
	 *   // The narrowFn below has only the Guest type left to narrow to.
	 *  (value): value is Guest => value.role === "guest"
	 *  () => []
	 * ).exhaust([]); // .exhaust(...) is available as the value is exhaustively narrowed.
	 */
	public case<const U extends TNarrowed, V>(
		narrowFn: (value: TNarrowed) => value is U,
		mapFn: (value: U) => V,
	): NarrowSwitch<TIn, Exclude<TNarrowed, U>, TOut | V> {
		if (!this.state.done && narrowFn(this.state.value))
			return new NarrowSwitch({ done: true, result: mapFn(this.state.value) });
		return new NarrowSwitch<TIn, Exclude<TNarrowed, U>, TOut>(
			this.state as never,
		);
	}

	/**
	 * This method is a fallback method that completes the narrowing process by providing a fallback value or a fallback function that can map the remaining un-narrowed value.
	 *
	 * **Important**: This method is ONLY AVAILABLE when the value is not exhaustively narrowed, meaning that the narrowed type is not `never`.
	 * This behavior is useful to denote, using the type system, that a "default case" cannot be reached because the value has been exhaustively narrowed.
	 *
	 * @remarks the opposite of this method is {@link exhaust}, which is only available when the value is exhaustively narrowed.
	 * @param fallback - The fallback value or mapper function to call for terminating the narrowing process for non-exhaustively narrowed values.
	 * @template V - The type of the fallback value.
	 * @returns The result of the narrowing after applying all cases (@see {@link case}) and the fallback value.
	 *
	 * @example
	 * ```typescript
	 * type User = { role: "user", name: string };
	 * type Admin = { role: "admin", name: string, permissions: string[] };
	 * type Guest = { role: "guest" };
	 *
	 * declare const value: User | Admin | Guest;
	 * const narrowSwitch = NarrowSwitch.switch(value);
	 * // This is an example of a non-exhaustive narrowing terminated with a default value.
	 * const permissionsWithFallback: string[] = narrowSwitch.case(
	 * (value): value is User => value.role === "user"
	 * (value) => ["read", "write"]
	 * ).case(
	 * (value): value is Admin => value.role === "admin"
	 * (value) => ["read", "write", ...value.permissions]
	 * ).default((value) => []); // .default(...) is available as the value is not exhaustively narrowed (Guest hasn't been handled).
	 *
	 * // The following example will not compile as the value is exhaustively narrowed.
	 *
	 * narrowSwitch.case(
	 * (value): value is User => value.role === "user"
	 * (value) => ["read", "write"]
	 * ).case(
	 * (value): value is Admin => value.role === "admin"
	 * (value) => ["read", "write", ...value.permissions]
	 * ).case(
	 * (value): value is Guest => value.role === "guest"
	 * () => []
	 * ).default((value) => []); // This line will not compile as the value is exhaustively narrowed, thus the .default(...) method is not available.
	 * ```
	 */
	public default: IsNever<
		TNarrowed,
		never,
		<V>(fallback: ValueOrMapper<TNarrowed, V>) => TOut | V
	> = this._fallbackImpl as never;

	/**
	 * This method is a runtime-safe fallback method that completes the narrowing process and evalutes the value as exhaustively narrowed.
	 *
	 * **Important**:
	 * - This method is ONLY AVAILABLE when the value is exhaustively narrowed, meaning that the narrowed type is `never`.
	 * - This method forces you to provide a fallback value, even though the value is exhaustively narrowed.
	 * This design is to provide an extra layer of safety for the rare occasion where the value was not originally exhaustively narrowed.
	 * - If you are certain that the value is exhaustively narrowed, you can use the {@link exhaustUnsafe} method instead.
	 *
	 * @param fallback - The fallback value or mapper function to use in a case of a runtime narrowing miss.
	 * @template V - The type of the fallback value.
	 * @returns The result of the narrowing after applying all cases (@see {@link case}) and the fallback value.
	 * @remarks the parameter of the fallback function is typed `unknown` as the value is exhaustively narrowed by the type system, but still can be missed at runtime.
	 *
	 * @example
	 * ```typescript
	 * type User = { role: "user", name: string };
	 * type Admin = { role: "admin", name: string, permissions: string[] };
	 * type Guest = { role: "guest" };
	 *
	 * declare const value: User | Admin | Guest;
	 *
	 * // This is an example of an exhaustive narrowing with a fallback value.
	 * const userName: string[] = NarrowSwitch.switch(value)
	 *    .case((value): value is User => value.role === "user", (value) => value.name)
	 *    .case((value): value is Admin => value.role === "admin", (value) => value.name)
	 *    .case((value): value is Guest => value.role === "guest", () => "Guest")
	 *    .exhaust("UNKNOWN USER ROLE"); // .exhaust(...) is available as the value is exhaustively narrowed.
	 *
	 * // The following example will not compile as the value is not exhaustively narrowed.
	 * NarrowSwitch.switch(value)
	 *    .case((value): value is User => value.role === "user", (value) => value.name)
	 *    .case((value): value is Admin => value.role === "admin", (value) => value.name)
	 *    .exhaust("UNKNOWN USER ROLE"); // This line will not compile as the value is not exhaustively narrowed (Guest hasn't been handled).
	 *
	 *
	 * // This is a mock scenario where the value is tricked into being of type `User | Admin | Guest` but in reality, it is not, which would lead to runtime mismatches.
	 * const user = { role: "unknown-role", name: "John Doe" } as unknown as User | Admin | Guest;
	 *
	 * const result = NarrowSwitch.switch(user)
	 *    .case((value): value is User => value.role === "user", (value) => value.name)
	 *    .case((value): value is Admin => value.role === "admin", (value) => value.name)
	 *    .case((value): value is Guest => value.role === "guest", () => "Guest")
	 *    .exhaust("UNKNOWN USER ROLE");
	 *
	 * console.log(result); // This will print "UNKNOWN USER ROLE" as the value in reality hasn't been narrowed to any of the expected types.
	 * ```
	 */
	public exhaust: IsNever<
		TNarrowed,
		<V>(fallback: ValueOrMapper<unknown, V>) => TOut | V,
		never
	> = this._fallbackImpl as never;

	/**
	 * This method is a runtime-unsafe fallback method that completes the narrowing process and evalutes the value as exhaustively narrowed.
	 *
	 * **Important**:
	 * - This method is ONLY AVAILABLE when the value is exhaustively narrowed, meaning that the narrowed type is `never`.
	 * - This method is unsafe as it might throw a {@link NarrowError} if the value was not exhaustively narrowed at runtime (see example).
	 * - It is recommended to use {@link exhaust} instead of this method, as it provides an extra layer of safety.
	 *
	 * @returns The result of the narrowing after exhausting all cases (@see {@link case}).
	 * @throws {NarrowError} if the value is not exhaustively narrowed.
	 *
	 * @example
	 * ```typescript
	 * type User = { role: "user", name: string };
	 * type Admin = { role: "admin", name: string, permissions: string[] };
	 * type Guest = { role: "guest" };
	 *
	 * declare const value: User | Admin | Guest;
	 *
	 * // This is an example of an exhaustive narrowing with a fallback value.
	 * const userName: string[] = NarrowSwitch.switch(value)
	 *    .case((value): value is User => value.role === "user", (value) => value.name)
	 *    .case((value): value is Admin => value.role === "admin", (value) => value.name)
	 *    .case((value): value is Guest => value.role === "guest", () => "Guest")
	 *    .exhaustUnsafe; // .exhaustUnsafe is available as the value is exhaustively narrowed.
	 *
	 * // The following example will not compile as the value is not exhaustively narrowed.
	 * NarrowSwitch.switch(value)
	 *    .case((value): value is User => value.role === "user", (value) => value.name)
	 *    .case((value): value is Admin => value.role === "admin", (value) => value.name)
	 *    .exhaustUnsafe; // This line will not compile as the value is not exhaustively narrowed (Guest hasn't been handled).
	 *
	 *
	 * // This is a mock scenario where the value is tricked into being of type `User | Admin | Guest` but in reality, it is not, which would lead to runtime mismatches.
	 * const user = { role: "unknown-role", name: "John Doe" } as unknown as User | Admin | Guest;
	 * const result = NarrowSwitch.switch(user)
	 *  .case((value): value is User => value.role === "user", (value) => value.name)
	 *  .case((value): value is Admin => value.role === "admin", (value) => value.name)
	 *  .case((value): value is Guest => value.role === "guest", () => "Guest")
	 *  .exhaustUnsafe(); // This will throw a NarrowError as the value in reality hasn't been narrowed to any of the expected types.
	 * ```
	 */
	public exhaustUnsafe: IsNever<TNarrowed, () => TOut, never> = (() => {
		if (this.state.done) return this.state.result;
		throw new NarrowError(this.state.value);
	}) as never;

	private _fallbackImpl(fallback: ValueOrMapper<unknown, unknown>): unknown {
		return this.state.done
			? this.state.result
			: applyValueOrMapper(fallback, this.state.value);
	}
}

type IsNever<TValue, TTrue, TFalse> = [TValue] extends [never] ? TTrue : TFalse;
