import { Maybe } from "./maybe";
import { Result } from "./result";

type PipeFn<T, U> = (value: T) => U;

export class Pipe<T> {
	private readonly value: T;
	private constructor(value: T) {
		this.value = value;
	}

	static create<T>(value: T): Pipe<T> {
		return new Pipe(value);
	}

	public map<U>(mapFn: PipeFn<T, U>): Pipe<U> {
		return new Pipe(mapFn(this.value));
	}

	public effect(effectFn: (value: T) => void): Pipe<T> {
		effectFn(this.value);
		return this;
	}

	public unwrap(): T {
		return this.value;
	}

	intoMaybe() {
		return Maybe.from(this.value);
	}

	intoResult<E = never>() {
		return Result.Ok<T, E>(this.value);
	}
}
