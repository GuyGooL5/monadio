import { NarrowSwitch } from "./narrow-switch";

export const Narrow = {
	switch: <T>(value: T) => NarrowSwitch.switch(value),
} as const;
