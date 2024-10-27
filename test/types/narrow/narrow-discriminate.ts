import { NarrowDiscriminate } from "../../../src/narrow/narrow-discriminate";
import type { IsExact } from "../test-tools";

type TestType1 =
	| { key: "value1"; value: number }
	| { key: "value2"; value: string };

declare const testValue1: TestType1;

// Test: discriminate and match work, and infer the correct types for the mapping functions
() => {
	NarrowDiscriminate.discriminate(testValue1, "key").match<void>(
		{
			value1: (v) => {
				true satisfies IsExact<typeof v, { key: "value1"; value: number }>;
			},
			value2: (v) => {
				true satisfies IsExact<typeof v, { key: "value2"; value: string }>;
			},
		},
		() => {},
	);
};

// Test: match doesn't allow missing or extraneous discriminators
() => {
	NarrowDiscriminate.discriminate(testValue1, "key").match<void>(
		// @ts-expect-error: ts(2345) - Property 'value2' is missing
		{ value1: () => {} },
		() => {},
	);
	NarrowDiscriminate.discriminate(testValue1, "key").match<void>(
		{
			value1: () => {},
			value2: () => {},
			// @ts-expect-error: ts(2561) - 'value3' is not a known literal of testValue1.key
			value3: () => {},
		},
		() => {},
	);
};

// Test: return types are inferred correctly
() => {
	NarrowDiscriminate.discriminate(testValue1, "key").match(
		{ value1: () => 1, value2: () => 2 },
		() => 0,
	) satisfies number;
};

// Test: infered mixed return types are not allowed
() => {
	NarrowDiscriminate.discriminate(testValue1, "key").match(
		{
			value1: () => 1,
			value2: () =>
				// @ts-expect-error: ts(2322) - Type 'string' is not assignable to type 'number'
				"text",
		},
		() => 0,
	);
};

declare const TEST_SYMBOL: unique symbol;

type TestType2 =
	| { key: "a"; value: string } // Discriminator is a string
	| { key: 1.23; value: number } // Discriminator is a number
	| { key: typeof TEST_SYMBOL; value: boolean }; // Discriminator is a symbol

declare const testValue2: TestType2;

// Test: discriminate and match work with any PropertyKey type as the discriminator
() => {
	NarrowDiscriminate.discriminate(testValue2, "key").match<void>(
		{
			a: (v) => {
				true satisfies IsExact<typeof v, { key: "a"; value: string }>;
			},
			1.23: (v) => {
				true satisfies IsExact<typeof v, { key: 1.23; value: number }>;
			},
			[TEST_SYMBOL]: (v) => {
				true satisfies IsExact<
					typeof v,
					{ key: typeof TEST_SYMBOL; value: boolean }
				>;
			},
		},
		() => {},
	);
};

// Test: match doesn't allow missing discriminators of type number and symbol
() => {
	NarrowDiscriminate.discriminate(testValue2, "key").match<void>(
		// @ts-expect-error: ts(2345) - symbol type is missing
		{ a: () => {}, 1: () => {} },
		() => {},
	);
	NarrowDiscriminate.discriminate(testValue2, "key").match<void>(
		// @ts-expect-error: ts(2345) - number type is missing
		{ a: () => {}, [TEST_SYMBOL]: () => {} },
		() => {},
	);
};

type TestType3 =
	| { key: "a"; value: string }
	| { key: () => void; value: number };

declare const testValue3: TestType3;

// Test: cannot discriminate on a key that doesn't extend PropertyKey
() => {
	// @ts-expect-error: ts(2345)
	NarrowDiscriminate.discriminate(testValue3, "key");
};

type TestType4 =
	| { key: "a"; value: string }
	| { key: "b"; value: number }
	| { value: boolean };

declare const testValue4: TestType4;

// Test: cannot discriminate on a key that is not present in all union members
() => {
	// @ts-expect-error: ts(2345)
	NarrowDiscriminate.discriminate(testValue4, "key");
};

type TestType5 =
	| { key1: "a"; key2: 1; value: string }
	| { key1: "b"; key2: 2; value: number };

declare const testValue5: TestType5;

// Test: allow multiple discriminators for the same type
() => {
	NarrowDiscriminate.discriminate(testValue5, "key1");
	NarrowDiscriminate.discriminate(testValue5, "key2");
};

type TestType6 = { key: "a"; value: string };

declare const testValue6: TestType6;

// Test: fallback must be provided
() => {
	NarrowDiscriminate.discriminate(testValue6, "key")
		// @ts-expect-error: ts(2554) - Expected 2 arguments, but got 1
		.match<void>({ a: () => {} });
};

// Test: fallback parameter type is unknown
() => {
	NarrowDiscriminate.discriminate(testValue6, "key").match<void>(
		{ a: () => {} },
		(fallback) => {
			true satisfies IsExact<typeof fallback, unknown>;
		},
	);
};

type TestType7 =
	| { key: "a"; value: string }
	| { key: "a"; value: number }
	| { key: "b"; value: boolean };

declare const testValue7: TestType7;

// Test: same discriminator value in different members results in a union of the types
() => {
	NarrowDiscriminate.discriminate(testValue7, "key").match<void>(
		{
			a: (v) => {
				true satisfies IsExact<
					typeof v,
					{ key: "a"; value: string } | { key: "a"; value: number }
				>;
			},
			b: (v) => {
				true satisfies IsExact<typeof v, { key: "b"; value: boolean }>;
			},
		},
		() => {},
	);
};

// Test: discriminating generalized non-literal types is not allowed (string | number | symbol)
() => {
	NarrowDiscriminate.discriminate(
		null as unknown as { key: string } | { key: "a" },
		// @ts-expect-error: ts(2345)
		"key",
	);
	NarrowDiscriminate.discriminate(
		null as unknown as { key: number } | { key: 1 },
		// @ts-expect-error: ts(2345)
		"key",
	);
	NarrowDiscriminate.discriminate(
		null as unknown as { key: symbol } | { key: typeof TEST_SYMBOL },
		// @ts-expect-error: ts(2345)
		"key",
	);
};
