import { createConsola } from "consola";

// Create a custom consola instance with both console and file reporters
export const logger = createConsola({
	level: 4,
	// @ts-ignore - the type is correct
	fancy: true,
	formatOptions: {
		colors: true,
		compact: false,
		date: true,
	},
});
