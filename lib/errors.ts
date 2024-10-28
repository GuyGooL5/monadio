export class MissingValueError extends Error {
	constructor() {
		super("Unwrapped a Maybe with no value");
	}
}

export class NarrowError<T> extends Error {
	readonly value: T;
	constructor(value: T, stringifyValue?: (value: T) => string) {
		super(`Failed to narrow value: ${stringifyValue?.(value) ?? value}`);
		this.value = value;
	}
}

export class AssertFailedError<T> extends Error {
	readonly value: T;
	constructor(value: T, stringifyValue?: (value: T) => string) {
		super(`Assertion failed: ${stringifyValue?.(value) ?? value}`);
		this.value = value;
	}
}

export class ResultUnwrapErrError<T> extends Error {
	readonly value: T;
	constructor(value: T, stringifyValue?: (value: T) => string) {
		super(`Failed to unwrap result error: ${stringifyValue?.(value) ?? value}`);
		this.value = value;
	}
}
