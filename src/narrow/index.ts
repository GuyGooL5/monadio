import { NarrowDiscriminate } from "./narrow-discriminate";
import { NarrowSwitch } from "./narrow-switch";
import { utils } from "./narrow-utils";

export const Narrow = Object.freeze({
	utils,
	switch: NarrowSwitch.switch,
	discriminate: NarrowDiscriminate.discriminate,
});
