import { AssertFailedError, NarrowError, ResultUnwrapErrError } from "./errors";
import { Maybe } from "./maybe";
import type { ValueOrFnOnce } from "./_util";

export type Ok<T> = { data: T };
export type Err<E> = { error: E };

/**
 * A utility type that extracts the data type of a Result instance.
 * @example
 * const result: Result<number, string> = Result.Ok(5);
 * type DataType = OkOf<typeof result>; // number
 */
export type OkOf<T extends RawResult<unknown, unknown>> = T extends RawResult<
	infer U,
	unknown
>
	? U
	: never;

/**
 * A utility type that extracts the error type of a Result instance.
 *
 * @example
 * const result: Result<number, string> = Result.Ok(5);
 * type ErrorType = ErrOf<typeof result>; // string
 */
export type ErrOf<T extends RawResult<unknown, unknown>> = T extends RawResult<
	unknown,
	infer E
>
	? E
	: never;

/**
 * RawResult is the raw data structure that a Result instance wraps.
 * it contains a value that is either an {@link Ok} or an {@link Err}.
 */
export interface RawResult<T, E> {
	readonly value: Ok<T> | Err<E>;
}

/**
 * The `Result` class is a utility for handling operations that can either succeed or fail.
 * It encapsulates a value that is either an `Ok` (successful result) or an `Err` (error result).
 * This class provides a robust way to handle errors and success cases without relying on exceptions.
 *
 * The `Result` class provides a set of functional methods to work with the data and error values
 * in a safe and expressive way without going through control flow statements, try/catch blocks, or type assertions.
 *
 * @remarks The `Result` class is inspired by Rust's `Result` type and the `Either` type in functional programming languages.
 *
 * To create a new `Result` instance you can use the following factory methods:
 * - {@link Result.Ok} to create a new instance that wraps a successful value.
 * ```typescript
 * const result: Result<number, Error> = Result.Ok(5);
 * ```
 * ---
 * - {@link Result.Err} to create a new instance that wraps an error value.
 * ```typescript
 * const resultWithErrorType = Result.Ok<number, string>(5);
 * ```
 * ---
 * - {@link Result.from} to create a new instance from an existing Result instance or a {@link RawResult} object.
 * ```typescript
 * const resultFromRaw = Result.from({ value: { data: 5 } });
 * ```
 * ---
 * - {@link Result.try} to safely create a new instance from a function that might throw a runtime error.
 * ```typescript
 * const resultFromFunction = Result.try(() => JSON.parse('invalid json'));
 * ```
 * ---
 * - {@link Result.narrow} to create a new instance that wraps a narrowed value that satisfies a type predicate.
 * ```typescript
 * type UserPermissions = 'admin' | 'user';
 * const resultFromNarrow = Result.narrow('admin', (value): value is UserPermissions => {
 * 	return value === 'admin' || value === 'user';
 * });
 * ```
 * ---
 * - {@link Result.combine} to combine multiple results into a single result.
 * ```typescript
 * const combinedResult = Result.combine(result1, result2, result3);
 * ```
 */
export class Result<T, E = unknown> implements RawResult<T, E> {
	readonly value: Ok<T> | Err<E>;

	private constructor(result: RawResult<T, E>) {
		this.value = result.value;
	}

	/**
	 * Creates a new Result instance that wraps the provided data as an Ok.
	 * @param data the data to be wrapped.
	 * @remarks if not provided, the error type will be inferred as never. You can provide a type argument to specify the error type if needed.
	 * @returns a new Result instance that wraps the provided data.
	 *
	 * @example
	 * const result: Result<number, never> = Result.Ok(5);
	 * const resultWithErrorType = Result.Ok<number, string>(5);
	 */
	public static Ok<T, E = never>(data: T): Result<T, E> {
		return new Result({ value: { data } });
	}

	/**
	 * Creates a new Result instance that wraps the provided error as an Err.
	 * @param error the error to be wrapped.
	 * @remarks if not provided, the data type will be inferred as never. You can provide a type argument to specify the data type if needed.
	 * @returns a new Result instance that wraps the provided error.
	 *
	 * @example
	 * const result: Result<never, Error> = Result.Err(new Error("error"));
	 * const resultWithDataType = Result.Err<Error, number>(new Error("error"));
	 */
	public static Err<E, T = never>(error: E): Result<T, E> {
		return new Result({ value: { error } });
	}

	/**
	 * Creates a new Result instance from a raw result object (or another Result instance).
	 *
	 * @remarks this method is useful when you need to populate a serialized result object into a Result instance.
	 * @param result the raw result object to populate into a Result instance.
	 * @returns a new Result instance that wraps the provided raw result object.
	 *
	 * @example
	 * const rawResult = JSON.parse(window.localStorage.getItem('result')) as RawResult<number, string>;
	 * const result = Result.from(rawResult);
	 */
	public static from<T, E>(result: RawResult<T, E>): Result<T, E> {
		return new Result(result);
	}

	/**
	 * Safely creates a new Result instance from a function that might throw a runtime error.
	 * @remarks This method is useful when integrating with 3rd party, existing code, or javascript code that might throw runtime errors,
	 * to safely catch and wrap the error in a Result instance.
	 * @param wrappedFn a function that might throw a runtime error.
	 * @returns a new Result instance that wraps the data if the function executed successfully, otherwise wraps the error.
	 * @example
	 * const result = Result.try(() => JSON.parse('invalid json'));
	 * if (result.isErr()) {
	 * 	console.error(result.unwrapErrUnsafe()); // SyntaxError: Unexpected token i in JSON at position 0
	 * }
	 */
	public static try<T>(wrappedFn: () => T): Result<T, unknown>;

	/**
	 * Safely creates a new Result instance from a function that might throw a runtime error.
	 * @remarks This method is useful when integrating with 3rd party, existing code, or javascript code that might throw runtime errors,
	 * to safely catch and wrap the error in a Result instance.
	 * @param wrappedFn a function that might throw a runtime error.
	 * @param mapErr a function that maps (and narrows) the error to a specific type.
	 * @returns a new Result instance that wraps the data if the function executed successfully, otherwise wraps the mapped error.
	 * @example
	 * const result = Result.try(
	 * 	() => JSON.parse("invalid json"),
	 * 	(e) => new Error("failed to parse json"),
	 * );
	 * if (result.isErr()) {
	 * 	console.error(result.unwrapErrUnsafe()); // Error: failed to parse json
	 * }
	 */
	public static try<T, E>(
		wrappedFn: () => T,
		mapErr: (e: unknown) => E,
	): Result<T, E>;

	public static try<T, E = unknown>(
		wrappedFn: () => T,
		mapErr?: (e: unknown) => E,
	): Result<T, E | unknown> {
		try {
			return Result.Ok(wrappedFn());
		} catch (e) {
			return Result.Err(mapErr ? mapErr(e) : e);
		}
	}

	/**
	 * Combines multiple results into a single result that wraps a tuple of the data values of the results or a union of the error values.
	 * @remarks the wrapped data-tuple will be in the same order as the provided results.
	 * @remarks if any of the results is an Err, the combined result will be an Err with the first error encountered.
	 * @param results a spread of (raw/) results to combine.
	 * @returns a new Result instance that wraps a tuple of the data values of the results or a union of the error values.
	 *
	 * @example
	 * const result1: Result<number, Error> = Result.Ok(5);
	 * const result2: Result<string, Error> = Result.Ok("hello");
	 * const result3: Result<boolean, Error> = Result.Ok(true);
	 *
	 * const combinedResult = Result.combine(result1, result2, result3);
	 * console.log(combinedResult.unwrapUnsafe()); // [5, "hello", true]
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * const combinedErrResult = Result.combine(result1, errResult, result3);
	 * console.log(combinedErrResult.unwrapErrUnsafe()); // Error: error
	 */
	public static combine<T extends RawResult<unknown, unknown>[]>(
		...results: T
	) {
		return results
			.map(Result.from)
			.reduce(
				(acc, current) =>
					acc.andThen((accData) =>
						current.map((currentData) => [...(accData as []), currentData]),
					),
				Result.Ok([]),
			) as Result<{ [K in keyof T]: OkOf<T[K]> }, ErrOf<T[number]>>;
	}

	/**
	 * This is a factory method that creates a new Result instance that wraps a narrowed value that satisfies a type predicate, otherwise wraps a {@link NarrowError}.
	 * @remarks This method is a good replacement for type assertions and type guards, as it provides a safe way to narrow any value and continue using it as a Result instance.
	 * @param value the value to narrow.
	 * @param narrowFn a type predicate function that checks if the value satisfies a condition.
	 * @returns a new Result instance that wraps the narrowed value if it satisfies the condition, otherwise wraps a {@link NarrowError}.
	 *
	 * @example
	 *
	 * type UserPermissions = "admin" | "user";
	 *
	 * declare const userPermissions: string;
	 *
	 * const permissionsResult = Result.narrow(userPermissions, (value): value is UserPermissions => {
	 * 	return value === "admin" || value === "user";
	 * });
	 *
	 * // permissionsResult is a Result<UserPermissions, NarrowError<string>>
	 */
	public static narrow<T, U extends T>(
		value: T,
		narrowFn: (value: T) => value is U,
	): Result<T, NarrowError<T>>;

	/**
	 * This is a factory method that creates a new Result instance that wraps a narrowed value that satisfies a type predicate, otherwise wraps a custom error.
	 * @remarks This method is a good replacement for type assertions and type guards, as it provides a safe way to narrow any value and continue using it as a Result instance.
	 * @param value the value to narrow.
	 * @param narrowFn a type predicate function that checks if the value satisfies a condition.
	 * @param error the error to wrap if the value does not satisfy the condition.
	 * @returns a new Result instance that wraps the narrowed value if it satisfies the condition, otherwise wraps the provided error.
	 *
	 * @example
	 *
	 * type UserPermissions = "admin" | "user";
	 * declare class PermissionError extends Error {}
	 * declare const userPermissions: string;
	 *
	 * const permissionsResult = Result.narrow(userPermissions, (value): value is UserPermissions => {
	 * 	return value === "admin" || value === "user";
	 * }, new PermissionError("invalid permissions"));
	 *
	 * // permissionsResult is a Result<UserPermissions, PermissionError>
	 */
	public static narrow<T, U extends T, E>(
		value: T,
		narrowFn: (value: T) => value is U,
		error: E,
	): Result<U, E>;

	/**
	 * This is a factory method that creates a new Result instance that wraps a narrowed value that satisfies a type predicate, otherwise wraps a custom error.
	 * @remarks This method is a good replacement for type assertions and type guards, as it provides a safe way to narrow any value and continue using it as a Result instance.
	 * @param value the value to narrow.
	 * @param narrowFn a type predicate function that checks if the value satisfies a condition.
	 * @param errorFn a function that takes the value that does not satisfy the condition and returns an error.
	 * @remarks the error function is smart enough to inversely narrow the value to the excluded type.
	 * @returns a new Result instance that wraps the narrowed value if it satisfies the condition, otherwise wraps the error returned by the error function.
	 * @example
	 * type AllPermissions = "admin" | "user" | "guest";
	 * type LoggedInPermissions = "admin" | "user";
	 *
	 * declare const userPermissions: AllPermissions;
	 *
	 * const permissionsResult = Result.narrow(
	 * 	userPermissions,
	 * 	(value): value is LoggedInPermissions => {
	 * 		return value === "admin" || value === "user";
	 * 	},
	 * 	(value) =>
	 * 		// value is narrowed to "guest" here
	 * 		new Error(`invalid permissions: ${value}`),
	 * );
	 * // permissionsResult is Result<LoggedInPermissions, Error>
	 */
	public static narrow<T, U extends T, E>(
		value: T,
		narrowFn: (value: T) => value is U,
		errorFn: (value: Exclude<T, U>) => E,
	): Result<U, E>;

	public static narrow<T, U extends T, E>(
		value: T,
		narrowFn: (value: T) => value is U,
		error?: E | ((value: Exclude<T, U>) => E),
	): Result<U, E | NarrowError<T>> {
		return Result.Ok(value).narrow(narrowFn, error as never);
	}

	public narrow<U extends T>(
		narrowFn: (value: T) => value is U,
	): Result<U, E | NarrowError<T>>;
	public narrow<U extends T>(
		narrowFn: (value: T) => value is U,
		error: E,
	): Result<U, E>;
	public narrow<U extends T>(
		narrowFn: (value: T) => value is U,
		errorFn: (value: Exclude<T, U>) => E,
	): Result<U, E>;
	public narrow<U extends T>(
		narrowFn: (value: T) => value is U,
		error?: E | ((value: Exclude<T, U>) => E),
	): Result<U, E | NarrowError<T>> {
		if (this.isErr()) return Result.Err(this.unwrapErrUnsafe());
		const value = this.unwrapUnsafe();
		if (narrowFn(value)) return Result.Ok(value);
		if (!error) return Result.Err(new NarrowError(value));
		if (error instanceof Function)
			return Result.Err(error(value as Exclude<T, U>));
		return Result.Err(error);
	}

	/**
	 * Checks if the result is an Ok.
	 * @remarks This method returns a type predicate that narrows the result instance's Error type to never.
	 * @remarks Try to avoid using this method, there might a better alternative using {@link map}, {@link unwrap}, {@link effectOnOk}, or {@link maybeOk} instead.
	 * @returns true if the result is an Ok, otherwise false.
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * if (result.isOk()) {
	 * 	console.log(result.unwrapUnsafe()); // calling unwrapUnsafe is safe here because the result is guaranteed to be an Ok
	 * }
	 */
	public isOk(): this is Result<T, never> {
		return "data" in this.value;
	}

	/**
	 * Checks if the result is an Err.
	 * @remarks This method returns a type predicate that narrows the result instance's Data type to never.
	 * @remarks Try to avoid using this method, there might a better alternative using {@link mapErr}, {@link unwrapErr}, {@link effectOnErr}, or {@link maybeErr} instead.
	 * @returns true if the result is an Err, otherwise false.
	 * @example
	 * const result: Result<number, Error> = Result.Err(new Error("error"));
	 * if (result.isErr()) {
	 * 	console.log(result.unwrapErrUnsafe()); // calling unwrapErrUnsafe is safe here because the result is guaranteed to be an Err
	 * }
	 */
	public isErr(): this is Result<never, E> {
		return "error" in this.value;
	}

	/**
	 * Converts the result to a Maybe instance that wraps the data if the result is Ok, otherwise wraps null.
	 */
	public maybeOk(): Maybe<T> {
		return Maybe.from("data" in this.value ? this.value.data : null);
	}

	/**
	 * Converts the result to a Maybe instance that wraps the error if the result is Err, otherwise wraps null.
	 */
	public maybeErr(): Maybe<E> {
		return Maybe.from("error" in this.value ? this.value.error : null);
	}

	/**
	 * Maps the data of the result to another value.
	 * If the result is an Err, it will return the Err value.
	 *
	 * @param mapFn the function to map the data to another value.
	 * @returns a new Result instance with the mapped data.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * const mappedResult: Result<string, Error> = result.map((data) => `number is: ${data}`);
	 * console.log(mappedResult.unwrap()); // "number is: 5"
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * const mappedErrResult: Result<string, Error> = errResult.map((data) => `number is: ${data}`);
	 * console.log(mappedErrResult.unwrapErr()); // Error: error
	 */
	public map<U>(mapFn: (data: T) => U): Result<U, E> {
		if (this.isErr()) return this;
		return Result.Ok(mapFn(this.unwrapUnsafe()));
	}

	/**
	 * Maps the error of the result to another value.
	 * If the result is an Ok, it will return the Ok value.
	 * @param mapErrFn the function to map the error to another value.
	 * @returns a new Result instance with the mapped error.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok<number, Error>(5);
	 * const mappedResult: Result<number, string> = errResult.mapErr((error) => error.message.toUpperCase());
	 * console.log(mappedResult.unwrap()); // 5
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * const mappedErrResult: Result<number, string> = errResult.mapErr((error) => error.message.toUpperCase());
	 * console.log(mappedErrResult.unwrapErr()); // "ERROR"
	 *
	 */
	public mapErr<F>(mapErrFn: (error: E) => F): Result<T, F> {
		if (this.isOk()) return this;
		return Result.Err(mapErrFn(this.unwrapErrUnsafe()));
	}

	/**
	 * Safely unwraps the data of the result if it is an Ok, otherwise returns a provided default value.
	 *
	 * @param defaultValue a value or a function that takes no arguments and returns a value to be returned if the result wraps an error.
	 * @returns the data or the default data value.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * console.log(result.unwrap(0)); // 5
	 * console.log(result.unwrap(() => 0)); // 5
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * console.log(errResult.unwrap(0)); // 0
	 * console.log(errResult.unwrap(() => 0)); // 0
	 */
	public unwrap(defaultValue: ValueOrFnOnce<T>): T {
		return this.maybeOk().unwrap(defaultValue);
	}

	/**
	 * Safely unwraps the error of the result if it is an Err, otherwise returns a provided default value.
	 *
	 * @param defaultError a value or a function that takes no arguments and returns an error to be returned if the result wraps a data.
	 * @returns the result's error or the default error.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * console.log(result.unwrapErr(new Error("default error"))); // Error: default error
	 * console.log(result.unwrapErr(() => new Error("default error"))); // Error: default error
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("custom error"));
	 * console.log(errResult.unwrapErr(new Error("default error"))); // Error: custom error
	 * console.log(errResult.unwrapErr(() => new Error("default error"))); // Error: custom error
	 */
	public unwrapErr(defaultError: ValueOrFnOnce<E>): E {
		return this.maybeErr().unwrap(defaultError);
	}

	/**
	 * Unwraps the data the result wraps if it is an Ok, otherwise throws the error the result wraps.
	 *
	 * **WARNING:** This method should be used with caution, it's an anti-pattern.
	 * Try to use alternatives like {@link unwrap}, {@link map}, or {@link maybeOk} instead.
	 *
	 * @returns the data {@typedef T} if the result is an Ok.
	 * @throws the error {@typedef E} if the result is an Err.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * console.log(result.unwrap()); // 5
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * console.log(errResult.unwrap()); // <- throws Error: error
	 *
	 */
	public unwrapUnsafe(): T {
		if ("data" in this.value) return this.value.data;
		throw this.value.error;
	}

	/**
	 * Unwraps the error the result wraps if it is an Err, otherwise throws an error.
	 *
	 * **WARNING:** This method should be used with caution, it's an anti-pattern.
	 * Try to use alternatives like {@link unwrapErr}, {@link mapErr}, or {@link maybeErr} instead.
	 *
	 * @returns the error if the result is an Err.
	 * @throws a custom error {@link ResultUnwrapErrError} that contains the data the result wraps if the result is an Ok.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * console.log(result.unwrapErr()); // <- throws ResultUnwrapErrError
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * console.log(errResult.unwrapErr()); // Error: error
	 */
	public unwrapErrUnsafe(): E {
		if ("error" in this.value) return this.value.error;
		throw new ResultUnwrapErrError(this.value.data);
	}
	/**
	 * Applies a function to the data of the result that returns a new result with the mapped data or a new error (of type {@link E}).
	 * If the current result is an Err, it will return the current result.
	 *
	 * This method is useful in a need to transform the data of the result to another value where an error might occur during the transformation.
	 *
	 * @param mapFn a function that takes the Ok value of the current result and returns a new result with the mapped data.
	 * @returns The result of applying the function to the data of the current result.
	 *
	 * @example
	 *
	 * // getUserById returns a Result<User, ApiError>
	 * declare function getUserById(id: string): Result<User, ApiError>;
	 * // apiResult is a result of a request to the API
	 * declare const apiResult: Result<Request, ApiError>;
	 *
	 * const userResult:Result<User, ApiError> = apiResult.andThen((request) => getUserById(request.params.id));
	 */
	public andThen<U>(mapFn: (data: T) => Result<U, E>): Result<U, E> {
		if (this.isOk()) return mapFn(this.unwrapUnsafe());
		return Result.Err(this.unwrapErrUnsafe());
	}

	/**
	 * Assert is a method that takes a function that returns a boolean value.
	 * It acts much like an if/else statement (or a guard clause) that checks if the data of the result satisfies a condition.
	 *
	 * @param assertFn a function that takes the data of the result and returns a boolean value.
	 *
	 * @returns a new Result instance with the data if the condition is satisfied, otherwise returns an Err with an {@link AssertFailedError} (or the original error).
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * const assertResult: Result<number, Error> = result.assert((data) => data > 0);
	 * console.log(assertResult.unwrapUnsafe()); // 5
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * const assertErrResult: Result<number, Error> = errResult.assert((data) => data > 0);
	 * console.log(assertErrResult.unwrapErrUnsafe()); // Error: error
	 *
	 * const failedAssertResult: Result<number, Error> = result.assert((data) => data < 0);
	 * console.log(failedAssertResult.unwrapErrUnsafe()); // AssertFailedError: Assertion failed: 5
	 *
	 */
	public assert(
		assertFn: (data: T) => boolean,
	): Result<T, E | AssertFailedError<T>>;

	/**
	 * Assert is a method that takes a function that returns a boolean value.
	 * It acts much like an if/else statement (or a guard clause) that checks if the data of the result satisfies a condition.
	 *
	 * @param assertFn a function that takes the data of the result and returns a boolean value.
	 * @param error an error value or a function that takes the data of the result and returns an error value.
	 *
	 * @returns a new Result instance with the data if the condition is satisfied, otherwise returns a result wrapping the error provided (or the original error).
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * const assertResult: Result<number, Error> = result.assert(
	 * 	(data) => data > 0,
	 * 	(data) => new Error(`${data} is not greater than 0`),
	 * );
	 * console.log(assertResult.unwrapUnsafe()); // 5
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error("error"));
	 * const assertErrResult: Result<number, Error> = errResult.assert(
	 * 	(data) => data > 0,
	 * 	(data) => new Error(`${data} is not greater than 0`),
	 * );
	 * console.log(assertErrResult.unwrapErrUnsafe()); // Error: error
	 *
	 * const failedAssertResult: Result<number, Error> = result.assert(
	 * 	(data) => data < 0,
	 * 	(data) => new Error(`${data} is not less than 0`),
	 * );
	 * console.log(failedAssertResult.unwrapErrUnsafe()); // Error: 5 is not less than 0
	 */
	public assert(
		assertFn: (data: T) => boolean,
		error: E | ((data: T) => E),
	): Result<T, E>;

	public assert(
		assertFn: (data: T) => boolean,
		error?: E | ((data: T) => E),
	): Result<T, AssertFailedError<T> | E> {
		if (this.isErr()) return this;
		const data = this.unwrapUnsafe();
		if (assertFn(data)) return Result.Ok(data);
		if (!error) return Result.Err(new AssertFailedError(data));
		if (error instanceof Function) return Result.Err(error(data));
		return Result.Err(error);
	}

	/**
	 * Flattens a nested result.
	 *
	 * @remarks This method is only available to use when the data {@see T} is a Result instance, otherwise it short-circuits to never.
	 * @returns a result instance that wraps the data and error of the nested result, or the original error.
	 *
	 * @example
	 * const result: Result<Result<number, Error>, Error> = Result.Ok(Result.Ok(5));
	 * const flattenedResult: Result<number, Error> = result.flatten();
	 * console.log(flattenedResult.unwrapUnsafe()); // 5
	 *
	 * const errResult: Result<Result<number, Error>, Error> = Result.Err(new Error("error"));
	 * const flattenedErrResult: Result<number, Error> = errResult.flatten();
	 * console.log(flattenedErrResult.unwrapErrUnsafe()); // Error: error
	 *
	 * const notNestedResult: Result<number, Error> = Result.Ok(5);
	 * notNestedResult.flatten(); // this is a compile error
	 *
	 */
	public flatten: T extends Result<infer U, E> ? () => Result<U, E> : never =
		(() => {
			return this.andThen((v) => v as never);
		}) as never;

	/**
	 * This method runs a callback function on the data (if the result is an Ok) to perform a side effect.
	 *
	 * **Note**: The effect function should not mutate the data and should not return a value (as it will be ignored).
	 * @param effectFn a function that takes the data of the result and performs a side effect.
	 * @returns the current result instance after the effect function is executed.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * result.onSuccess((data) => localStorage.setItem('data', data.toString())); // this will be executed
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error('error'));
	 * errResult.onSuccess((data) => localStorage.setItem('data', data.toString())); // this will not be executed
	 */
	public effectOnOk(effectFn: (data: Readonly<T>) => void): Result<T, E> {
		return this.map((v) => {
			effectFn(v);
			return v;
		});
	}

	/**
	 * This method runs a callback function on the error (if the result is an Err) to perform a side effect.
	 *
	 * **Note**: The effect function should not mutate the error and should not return a value (as it will be ignored).
	 * @param effectFn a function that takes the error of the result and performs a side effect.
	 * @returns the current result instance after the effect function is executed.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * result.onErr((error) => console.error(error)); // this will not be executed
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error('error'));
	 * errResult.onErr((error) => console.error(error)); // this will be executed
	 */
	public effectOnErr(effectFn: (error: Readonly<E>) => void): Result<T, E> {
		return this.mapErr((e) => {
			effectFn(e);
			return e;
		});
	}

	/**
	 * Inverts the result instance, meaning that it swaps the data and error and returns a new result instance.
	 * @remarks
	 * - If the result is an Ok, it will return an Err with the data, and vice versa.
	 * - This method is useful when you need to handle the error case as a data case and vice versa.
	 *
	 * @returns a new Result instance with the inverted data and error.
	 *
	 * @example
	 * const result: Result<number, Error> = Result.Ok(5);
	 * const invertedResult: Result<Error, number> = result.invert();
	 * console.log(invertedResult.unwrapErrUnsafe()); // 5
	 *
	 * const errResult: Result<number, Error> = Result.Err(new Error('error'));
	 * const invertedErrResult: Result<Error, number> = errResult.invert();
	 * console.log(invertedErrResult.unwrapUnsafe()); // Error: error
	 */
	public invert(): Result<E, T> {
		if (this.isOk()) return Result.Err(this.unwrapUnsafe());
		return Result.Ok(this.unwrapErrUnsafe());
	}

	/**
	 * Dump is used to extract the raw data of the result as a plain javascript object.
	 * @returns a plain javascript object that contains the wrapped value (data or error).
	 */
	dump(): RawResult<T, E> {
		return { value: this.value };
	}
}
