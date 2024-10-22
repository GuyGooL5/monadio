import { Pipe } from "./pipe";

type ProcFn<T, U> = (value: T) => U;

export class Procedure<const TIn, const TOut> {
	private readonly procFn: ProcFn<TIn, TOut>;

	private constructor(procFn: ProcFn<TIn, TOut>) {
		this.procFn = procFn;
	}

	static create<T>(): Procedure<T, T> {
		return new Procedure((value: T) => value);
	}

	public map<const U>(mapFn: ProcFn<TOut, U>): Procedure<TIn, U> {
		return new Procedure((value: TIn) => mapFn(this.procFn(value)));
	}

	public effect(effectFn: (value: TOut) => void): Procedure<TIn, TOut> {
		return new Procedure((value: TIn) => {
			const result = this.procFn(value);
			effectFn(result);
			return result;
		});
	}

	public run(value: TIn): TOut {
		return this.procFn(value);
	}

	public runIntoPipe(value: TIn): Pipe<TOut> {
		return Pipe.create(this.run(value));
	}

	public buildCallback(): ProcFn<TIn, TOut> {
		return this.procFn;
	}
}
