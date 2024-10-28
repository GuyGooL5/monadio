import { Pipe } from "./pipe";

type ProcFn<T, U> = (value: T) => U;

/**
 * Procedure is a class that represents a lazy flow of data transformation (and effects).
 * @remarks
 * - Procedure is similar in nature to {@link Pipe}, but instead of directly running on some value, it creates a workflow that can be run later or composed.
 * - a Procedure is basically a builder for function composition.
 *
 * To create a Procedure, use the static method {@link Procedure.create} followed by chaining the builder methods {@link Procedure.map}, {@link Procedure.effect}, and {@link Procedure.andThen}.
 * To finalize the Procedure, you can run it using the {@link Procedure.run} and {@link Procedure.runIntoPipe} methods, or you can build a callback function using the {@link Procedure.buildCallback} method.
 * ```typescript
 * const addOneAndLog = Procedure.create<number>()
 * 	.map((value) => value + 1)
 * 	.effect(console.log);
 *
 * const result = addOneAndLog.run(1); // logs(2) and returns 2
 * ```
 * ---
 * Procedures are composable and immutable, meaning you can create new Procedures that are derivatives of existing ones.
 * For example, you can create a base Procedure `addOne` and then use it to create new procedures that build on top of it.
 * ```typescript
 * const addOne = Procedure.create<number>().map((value) => value + 1);
 * const addOneAndDouble = addOne.map((value) => value * 2);
 * const addOneAndLog = addOne.effect(console.log);
 *
 * const result = addOneAndDouble.run(1); // returns 4
 * const result2 = addOneAndLog.run(1); // logs(2) and returns 2
 * ```
 * ---
 * Procedures can be composed using the {@link Procedure.andThen} method, which allows you to chain multiple Procedures together.
 *
 * ```typescript
 * const addOne = Procedure.create<number>().map((value) => value + 1);
 * const double = Procedure.create<number>().map((value) => value * 2);
 *
 * const addOneAndDouble = addOne.andThen(double);
 * const doubleAndAddOne = double.andThen(addOne);
 *
 * const result = addOneAndDouble.run(1); // returns 4
 * const result2 = doubleAndAddOne.run(1); // returns 3
 * ```
 * ---
 * Procedures can be used to build callback functions that can be passed around and run later using the {@link Procedure.buildCallback} method.
 * ```typescript
 * function vanillaCallback(value: number) {
 * 	value += 1;
 *  value *= 2;
 *  console.log(value);
 * 	return value;
 * }
 * // is the same as:
 * const procedureCallback = Procedure.create<number>()
 * 	.map((value) => value + 1)
 * 	.map((value) => value * 2)
 * 	.effect(console.log)
 * 	.buildCallback();
 *
 * const vanillaResult = vanillaCallback(1); // logs(4) and returns 4
 * const procedureResult = procedureCallback(1); // logs(4) and returns 4
 */
export class Procedure<const TIn, const TOut> {
	private constructor(private readonly procFn: ProcFn<TIn, TOut>) {}

	/**
	 * Creates a new Procedure that returns the value it receives.
	 * @returns a new Procedure that returns the value it receives.
	 */
	static create<T>(): Procedure<T, T> {
		return new Procedure((value: T) => value);
	}

	/**
	 * Map is a transformation method that takes a function that transforms the value of the Procedure into a new value.
	 * @remarks
	 * - The map method is lazy and does not run the function immediately.
	 * - The map method is immutable and returns a new Procedure with the transformation applied.
	 * @param mapFn - A function that transforms the value of the Procedure.
	 * @returns a new Procedure with the transformation applied.
	 *
	 * @example
	 * ```typescript
	 * const addOne = Procedure.create<number>().map((value) => value + 1);
	 * const result = addOne.run(1); // returns 2
	 *
	 * // map can be chained
	 * const addOneAndDouble = Procedure.create<number>()
	 * 	.map((value) => value + 1)
	 * 	.map((value) => value * 2);
	 * const result2 = addOneAndDouble.run(1); // returns 4
	 */
	public map<const U>(mapFn: ProcFn<TOut, U>): Procedure<TIn, U> {
		return new Procedure((value: TIn) => mapFn(this.procFn(value)));
	}

	/**
	 * Composes two procedures together, where the output of the first Procedure is the input of the second Procedure.
	 * @remarks The andThen method is lazy and does not run the Procedures immediately.
	 * @param nextProcedure - The Procedure to run after the current Procedure.
	 * @returns a new Procedure that is the composition of the two Procedures (does not mutate the original Procedures).
	 * @example
	 * ```typescript
	 * const addOne = Procedure.create<number>().map((value) => value + 1);
	 * const double = Procedure.create<number>().map((value) => value * 2);
	 *
	 * const addOneAndDouble = addOne.andThen(double);
	 * console.log(addOneAndDouble.run(1)); // 4
	 */
	public andThen<const U>(
		nextProcedure: Procedure<TOut, U>,
	): Procedure<TIn, U> {
		return new Procedure((value: TIn) =>
			nextProcedure.procFn(this.procFn(value)),
		);
	}

	/**
	 * Runs a side effect function on the value of the Procedure.
	 * @param effectFn - A function that runs a side effect on the value of the Procedure.
	 * @remarks
	 * - The effect method is lazy and does not run the function immediately.
	 * - The effect method is immutable and returns a new Procedure with the effect applied.
	 * - the `effectFn` function should not return anything, and mustn't mutate the value.
	 * @returns a new Procedure with the effect applied.
	 *
	 * @example
	 * ```typescript
	 * const addOneAndLog = Procedure.create<number>()
	 * 	.map((value) => value + 1)
	 * 	.effect(console.log);
	 * const result = addOneAndLog.run(1); // logs(2) and returns 2
	 */
	public effect(
		effectFn: (value: Readonly<TOut>) => void,
	): Procedure<TIn, TOut> {
		return new Procedure((value: TIn) => {
			const result = this.procFn(value);
			effectFn(result);
			return result;
		});
	}

	/**
	 * Runs the Procedure on a value and returns the result.
	 * @param value - The value to run the Procedure on.
	 * @returns The result of running the Procedure on the value.
	 * @remarks the run method can be used multiple times on different values as the Procedure is immutable and running it does not change the Procedure.
	 * @example
	 * ```typescript
	 * const addOne = Procedure.create<number>().map((value) => value + 1);
	 * console.log(addOne.run(1)); // 2
	 * console.log(addOne.run(2)); // 3
	 * ```
	 */
	public run(value: TIn): TOut {
		return this.procFn(value);
	}

	/**
	 * Runs the Procedure on a value and returns the result as a {@link Pipe}.
	 * @param value - The value to run the Procedure on.
	 * @returns A Pipe with the result of running the Procedure on the value.
	 * @remarks this method is equivalent to calling `Pipe.create(procedure.run(value))`.
	 * @example
	 * ```typescript
	 * const addOne = Procedure.create<number>().map((value) => value + 1);
	 * const pipe = addOne.runIntoPipe(1);
	 * console.log(pipe.unwrap()); // 2
	 * ```
	 */
	public runIntoPipe(value: TIn): Pipe<TOut> {
		return Pipe.create(this.run(value));
	}

	/**
	 * Builds a callback function that can be run later.
	 * @returns a function that can be run later with a value of type `TIn` and returns a value of type `TOut`.
	 * @remarks The buildCallback method is useful for creating callback functions that can be passed around and run later.
	 * @example
	 * ```typescript
	 * const addOneAndLog = Procedure.create<number>()
	 * 	.map((value) => value + 1)
	 * 	.effect(console.log)
	 * 	.buildCallback();
	 * const result = addOneAndLog(1); // logs(2) and returns 2
	 * const result2 = addOneAndLog(2); // logs(3) and returns 3
	 * ```
	 */
	public buildCallback(): ProcFn<TIn, TOut> {
		return this.procFn;
	}
}
