import { createConsola } from "consola";

// Create a custom consola instance with both console and file reporters
export const logger = createConsola({
	level: -999,
	// @ts-ignore - the type is correct
	fancy: true,
	formatOptions: {
		colors: true,
		compact: false,
		date: true,
	},
});

/**
 * Creates a simple progress bar string
 * @param current Current progress value
 * @param total Total progress value
 * @param length Length of the progress bar
 * @returns Progress bar string
 */
export function createProgressBar(current: number, total: number, length: number = 30): string {
	const progress = Math.min(Math.max(current / total, 0), 1);
	const filledLength = Math.round(length * progress);
	const emptyLength = length - filledLength;

	const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
	const percentage = Math.round(progress * 100);

	return `[${progressBar}] ${current}/${total} (${percentage}%)`;
}
