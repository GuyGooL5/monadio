import { MissingValueError } from "./errors";
import { Pipe } from "./pipe";
import { Result } from "./result";
import { type ValueOrFnOnce, applyValueOrFnOnce } from "./types";

type RawMaybe<T> = T | null | undefined;

export class Maybe<T> {
	protected readonly value: T | null;
	private constructor(value: RawMaybe<T>) {
		this.value = value ?? null;
	}

	static None<T>(): Maybe<T> {
		return new Maybe<T>(null);
	}

	static Some<T>(value: T): Maybe<T> {
		return new Maybe(value);
	}
	static from<T>(value: RawMaybe<T> | Maybe<T>): Maybe<NonNullable<T>> {
		return (value instanceof Maybe ? value : new Maybe(value)) as never;
	}

	static try<T>(wrappedFn: () => RawMaybe<T> | Maybe<T>): Maybe<T> {
		try {
			return Maybe.from(wrappedFn());
		} catch (_) {
			return Maybe.None();
		}
	}

	static narrow<T, U extends T>(
		value: T,
		narrowFn: (value: T) => value is NonNullable<U>,
	): Maybe<U> {
		return Maybe.from(value).narrow(narrowFn);
	}

	narrow<U extends T>(narrowFn: (value: T) => value is U): Maybe<U> {
		return this.andThen((value) =>
			narrowFn(value) ? Maybe.Some(value) : Maybe.None(),
		);
	}

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

	public isSome(): boolean {
		return this.value !== null;
	}

	public isNone(): boolean {
		return this.value === null;
	}

	public map<U>(mapFn: (data: T) => U): Maybe<U> {
		return Maybe.from<U>(this.value !== null ? mapFn(this.value) : null);
	}

	public mapOr<U>(defaultValue: ValueOrFnOnce<U>, mapFn: (data: T) => U): U {
		return this.value == null
			? applyValueOrFnOnce(defaultValue)
			: mapFn(this.value);
	}

	public unwrapOr(defaultValue: ValueOrFnOnce<T>): T {
		return this.value ?? applyValueOrFnOnce(defaultValue);
	}

	public orElse(nextMaybe: ValueOrFnOnce<RawMaybe<T> | Maybe<T>>): Maybe<T> {
		return Maybe.from(
			this.value == null ? applyValueOrFnOnce(nextMaybe) : this.value,
		);
	}

	public andThen<U>(nextMaybe: (data: T) => RawMaybe<U> | Maybe<U>): Maybe<U> {
		return this.value == null
			? Maybe.None()
			: Maybe.from(nextMaybe(this.value));
	}

	public onSome(fn: (data: T) => void): this {
		if (this.value != null) fn(this.value);
		return this;
	}

	public onNone(fn: () => void): this {
		if (this.value == null) fn();
		return this;
	}

	public dump(): T | null {
		return this.value;
	}

	flatten: T extends Maybe<infer U> ? () => Maybe<U> : never = (() => {
		return Maybe.from(this.value);
	}) as never;

	public unwrap(): T {
		if (this.value == null) throw new MissingValueError();
		return this.value;
	}

	// cross-monad operations

	public intoResult(): Result<T, MissingValueError>;
	public intoResult<E>(error: ValueOrFnOnce<E>): Result<T, E>;
	public intoResult<E>(
		error?: ValueOrFnOnce<E>,
	): Result<T, E | MissingValueError> {
		return this.mapOr(
			Result.Err(error ? applyValueOrFnOnce(error) : new MissingValueError()),
			Result.Ok,
		);
	}

	public intoPipe(): Pipe<T | null> {
		return Pipe.create(this.value);
	}
}
