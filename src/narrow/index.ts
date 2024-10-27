import { NarrowDiscriminate } from "./narrow-discriminate";
import { NarrowSwitch } from "./narrow-switch";

export const Narrow = {
	switch: NarrowSwitch.switch,
	discriminate: NarrowDiscriminate.discriminate,
} as const;
