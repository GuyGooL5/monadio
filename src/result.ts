import { AssertFailedError, NarrowError, ResultUnwrapErrError } from "./errors";
import { Maybe } from "./maybe";
import type { ValueOrFnOnce } from "./types";

export type Ok<T> = { data: T };
export type Err<E> = { error: E };
export interface RawResult<T, E> {
	readonly value: Ok<T> | Err<E>;
}

export class Result<T, E = unknown> implements RawResult<T, E> {
	readonly value: Ok<T> | Err<E>;

	private constructor(result: RawResult<T, E>) {
		this.value = result.value;
	}

	static Ok<T, E = never>(data: T): Result<T, E> {
		return new Result({ value: { data } });
	}

	static Err<E, T = never>(error: E): Result<T, E> {
		return new Result({ value: { error } });
	}

	static from<T, E>(result: RawResult<T, E>): Result<T, E> {
		return new Result(result);
	}

	static try<T>(wrappedFn: () => T): Result<T, unknown>;
	static try<T, E>(wrappedFn: () => T, mapErr: (e: unknown) => E): Result<T, E>;
	static try<T, E = unknown>(
		wrappedFn: () => T,
		mapErr?: (e: unknown) => E,
	): Result<T, E | unknown> {
		try {
			return Result.Ok(wrappedFn());
		} catch (e) {
			return Result.Err(mapErr ? mapErr(e) : e);
		}
	}

	static combine<T extends Result<unknown, unknown>[]>(...results: T) {
		return results.reduce(
			(acc, current) =>
				acc.andThen((accData) =>
					current.map((currentData) => [...(accData as []), currentData]),
				),
			Result.Ok([]),
		) as Result<{ [K in keyof T]: OkOf<T[K]> }, ErrOf<T[number]>>;
	}

	static narrow<T, U extends T>(
		value: T,
		narrowFn: (value: T) => value is U,
	): Result<T, NarrowError<T>>;

	static narrow<T, U extends T, E>(
		value: T,
		narrowFn: (value: T) => value is U,
		error: E,
	): Result<U, E>;
	static narrow<T, U extends T, E>(
		value: T,
		narrowFn: (value: T) => value is U,
		errorFn: (value: Exclude<T, U>) => E,
	): Result<U, E>;

	static narrow<T, U extends T, E>(
		value: T,
		narrowFn: (value: T) => value is U,
		error?: E | ((value: Exclude<T, U>) => E),
	): Result<U, E | NarrowError<T>> {
		return Result.Ok(value).narrow(narrowFn, error as never);
	}

	public narrow<U extends T>(
		narrowFn: (value: T) => value is U,
	): Result<U, NarrowError<T>>;
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

	public isOk(): this is Result<T, never> {
		return "data" in this.value;
	}

	public isErr(): this is Result<never, E> {
		return "error" in this.value;
	}

	public ok(): Maybe<T> {
		return Maybe.from("data" in this.value ? this.value.data : null);
	}

	public err(): Maybe<E> {
		return Maybe.from("error" in this.value ? this.value.error : null);
	}

	public map<U>(fn: (data: T) => U): Result<U, E> {
		if (this.isErr()) return this;
		return Result.Ok(fn(this.unwrapUnsafe()));
	}

	public mapErr<F>(fn: (error: E) => F): Result<T, F> {
		if (this.isOk()) return this;
		return Result.Err(fn(this.unwrapErrUnsafe()));
	}

	public unwrap(defaultValue: ValueOrFnOnce<T>): T {
		return this.ok().unwrapOr(defaultValue);
	}

	public unwrapErr(defaultError: ValueOrFnOnce<E>): E {
		return this.err().unwrapOr(defaultError);
	}

	public unwrapUnsafe(): T {
		if ("data" in this.value) return this.value.data;
		throw this.value.error;
	}
	public unwrapErrUnsafe(): E {
		if ("error" in this.value) return this.value.error;
		throw new ResultUnwrapErrError(this.value.data);
	}

	public andThen<U>(fn: (data: T) => Result<U, E>): Result<U, E> {
		if (this.isOk()) return fn(this.unwrapUnsafe());
		return Result.Err(this.unwrapErrUnsafe());
	}

	public assert(
		assertFn: (data: T) => boolean,
	): Result<T, AssertFailedError<T>>;

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
		if (!error) return Result.Err(new AssertFailedError<T>(data));
		if (error instanceof Function) return Result.Err(error(data));
		return Result.Err(error);
	}

	flatten: T extends Result<infer U, E> ? () => Result<U, E> : never = (() => {
		return this.andThen((v) => v as never);
	}) as never;

	onSuccess(fn: (data: T) => void): Result<T, E> {
		return this.map((v) => {
			fn(v);
			return v;
		});
	}

	onFailure(fn: (error: E) => void): Result<T, E> {
		return this.mapErr((e) => {
			fn(e);
			return e;
		});
	}

	dump(): RawResult<T, E> {
		return { value: this.value };
	}
}

type OkOf<T extends Result<unknown, unknown>> = T extends Result<
	infer U,
	unknown
>
	? U
	: never;

type ErrOf<T extends Result<unknown, unknown>> = T extends Result<
	unknown,
	infer E
>
	? E
	: never;
