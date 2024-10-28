import { Narrow } from "../../../src/narrow";
import type { IsExact } from "../test-tools";

type Guest = { type: "guest"; name: string };
type User = { type: "user"; name: string; id: number };
type Admin = { type: "admin"; name: string; id: number; role: string };

type AnyUser = Guest | User | Admin;

declare const user: AnyUser;

// Test: switch works, each case narrows the type, and correctly infers the mapped parameter and return type
() => {
	Narrow.switch(user)
		.case(
			(v): v is User => {
				true satisfies IsExact<typeof v, AnyUser>;
				return v.type === "user";
			},
			(v) => {
				true satisfies IsExact<typeof v, User>;
				return "user";
			},
		)
		.case(
			(v): v is Admin => {
				true satisfies IsExact<typeof v, Admin | Guest>;
				return v.type === "admin";
			},
			(v) => {
				true satisfies IsExact<typeof v, Admin>;
				return "admin";
			},
		)
		.case(
			(v): v is Guest => {
				true satisfies IsExact<typeof v, Guest>;
				return v.type === "guest";
			},
			(v) => {
				true satisfies IsExact<typeof v, Guest>;
				return "guest";
			},
		)
		.exhaust("unknown") satisfies string;
};

// Test: switch doesn't allow exhaust/exhaustUnsafe without fully narrowing the type
() => {
	Narrow.switch(user)
		.case(
			(v): v is User => v.type === "user",
			(v) => {},
		)
		// @ts-expect-error: ts(2349) - .exhaust is never
		.exhaust(() => {});

	Narrow.switch(user)
		.case(
			(v): v is User => v.type === "user",
			() => {},
		)
		// @ts-expect-error: ts(2349) - .exhaustUnsafe is never
		.exhaustUnsafe();
};

// Test: default case is available and correctly infer the excluded types
() => {
	Narrow.switch(user)
		.case(
			(v): v is Guest => v.type === "guest",
			() => "login",
		)
		.default((v) => {
			true satisfies IsExact<typeof v, Admin | User>;
			return "logout";
		});
};

// Test: exhaust mapper function takes unknown as argument
() => {
	Narrow.switch(0)
		.case(
			(v): v is number => true,
			() => {},
		)
		.exhaust((fallback) => {
			true satisfies IsExact<typeof fallback, unknown>;
		});
};

// Test: default case isn't available if the type is fully narrowed
() => {
	Narrow.switch(user)
		.case(
			(v): v is User => v.type === "user",
			() => {},
		)
		.case(
			(v): v is Admin => v.type === "admin",
			() => {},
		)
		.case(
			(v): v is Guest => v.type === "guest",
			() => {},
		)
		// @ts-expect-error: ts(2349) - .default is never
		.default(() => {});
};

// Test: the mapping function collects and unifies all return types
() => {
	const result = Narrow.switch(user)
		.case(
			(v): v is Guest => v.type === "guest",
			() => 1 as const,
		)
		.case(
			(v): v is User => v.type === "user",
			() => 2 as const,
		)
		.case(
			(v): v is Admin => v.type === "admin",
			() => 3 as const,
		)
		.exhaust(0 as const);
	true satisfies IsExact<typeof result, 0 | 1 | 2 | 3>;
};

// Test: exhaustUnsafe doesn't require a fallback and the return type is inferred correctly
() => {
	const result = Narrow.switch(user)
		.case(
			(v): v is Guest => v.type === "guest",
			() => 1 as const,
		)
		.case(
			(v): v is User => v.type === "user",
			() => 2 as const,
		)
		.case(
			(v): v is Admin => v.type === "admin",
			() => 3 as const,
		)
		.exhaustUnsafe();
	true satisfies IsExact<typeof result, 1 | 2 | 3>;
};
