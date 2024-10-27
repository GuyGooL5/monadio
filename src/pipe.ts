import { Maybe } from "./maybe";
import type { Procedure } from "./procedure";
import { Result } from "./result";

type PipeFn<T, U> = (value: T) => U;

/**
 * Pipe is a wrapper class around a value that allows you to chain transformations and effects in a functional way.
 *
 * @remarks if you need a lazy flow of data transformation, consider using {@link Procedure} instead.
 *
 * To create a Pipe, use the static method {@link Pipe.create} followed by chaining the methods {@link Pipe.map} and {@link Pipe.effect} to eagerly transform and produce side effects on the value.
 * To finalize the Pipe, you can unwrap the value using the {@link Pipe.unwrap} method, or you can convert it into a {@link Maybe} or {@link Result} using the {@link Pipe.intoMaybe} and {@link Pipe.intoResult} methods.
 *
 * ---
 * Here's a simple example of how using Pipe differs from using vanilla code:
 *
 * vanilla code:
 * ```typescript
 * declare const value: number;
 * const valuePlusOne = value + 1;
 * console.log("add One:", valuePlusOne);
 * const valueDoubled = valuePlusOne * 2;
 * const valueToFixed = valueDoubled.toFixed(2);
 * console.log("doubled and toFixed:", valueToFixed);
 * const result = valueToFIxed // this is not mandatory, but it's here to show we're done
 * ```
 * using Pipe:
 * ```typescript
 * declare const value: number;
 * const result = Pipe.create(value)
 * 	.map((value) => value + 1)
 * 	.effect((value) => console.log("add One:", value))
 * 	.map((value) => value * 2)
 * 	.map((value) => value.toFixed(2))
 * 	.effect((value) => console.log("doubled and toFixed:", value))
 * 	.unwrap();
 * ```
 * As you can see the flow of data in the Pipe is more explicit and contained (no need to declare intermediate variables and pollute the scope).
 */
export class Pipe<T> {
	private readonly value: T;
	private constructor(value: T) {
		this.value = value;
	}

	/**
	 * Wraps a value in a Pipe instance.
	 * @param value - the value to wrap in a Pipe.
	 * @returns a new Pipe instance.
	 */
	static create<T>(value: T): Pipe<T> {
		return new Pipe(value);
	}

	/**
	 * Maps the value of the Pipe to a new value using a transformation function.
	 * @param mapFn - the transformation function.
	 * @returns a new Pipe instance with the transformed value.
	 */
	public map<U>(mapFn: PipeFn<T, U>): Pipe<U> {
		return new Pipe(mapFn(this.value));
	}

	/**
	 * Applies a side effect to the value of the Pipe.
	 * @param effectFn - the side effect function.
	 * @returns a new Pipe instance with the same value as before.
	 */
	public effect(effectFn: (value: T) => void): Pipe<T> {
		effectFn(this.value);
		return new Pipe(this.value);
	}

	/**
	 * Unwraps the value of the Pipe (extracts the value from the Pipe as plain data).
	 * @returns the value of the Pipe.
	 */
	public unwrap(): T {
		return this.value;
	}

	/**
	 * Converts the value of the Pipe into a {@link Maybe} instance.
	 * @returns a new Maybe instance with the value of the Pipe.
	 * @remarks
	 * - This method is a equivalent to `Maybe.from(pipe.unwrap())`.
	 * - **Important**: although this method is completely fine, perhaps there is a way to inhernetly start with a Maybe instead of a Pipe, which would be more idiomatic.
	 * @see {@link Maybe}
	 * @see {@link Maybe.from}
	 *
	 * @example
	 * ```typescript
	 * type User = { name: string };
	 * declare const user: User | null;
	 * const maybeUserName = Pipe.create(user).map((user) => user?.name).intoMaybe();
	 * // 	^? Maybe<string>
	 * ```
	 */
	intoMaybe() {
		return Maybe.from(this.value);
	}

	/**
	 * Converts the value of the Pipe into a {@link Result} instance.
	 * @returns a new Result instance that is Ok with the value of the Pipe.
	 * @remarks
	 * - this method is equivalent to `Result.Ok(pipe.unwrap())`.
	 * - You can provide a custom generic type {@typedef E} to the method to create a Result with a custom error type.
	 * @see {@link Result}
	 * @see {@link Result.Ok}
	 *
	 * @example
	 * ```typescript
	 * type User = { name: string };
	 * declare const user: User;
	 * const userNameResult = Pipe.create(user).map((user) => user.name).intoResult();
	 * // 	^? Result<string, never>
	 */
	intoResult<E = never>() {
		return Result.Ok<T, E>(this.value);
	}
}
