import { createConsola } from "consola";
import { format, intervalToDuration } from "date-fns";

// Create a custom consola instance with both console and file reporters
export const logger = createConsola({
	level: 1, // Level 1 for important information (processing time, files processed, results)
	// @ts-ignore - the type is correct
	fancy: true,
	formatOptions: {
		colors: true,
		compact: false,
		date: true,
	},
	types: {
		// Level 1: Important information (processing time, files processed, results)
		start: { level: 1 },
		success: { level: 1 },
		ready: { level: 1 },
		fail: { level: 1 },
		box: { level: 1 },

		// Level 2: Important information (processing time, files processed, results)
		info: { level: 2 },

		// Level 3: Warnings
		warn: { level: 3 },

		// Level 4: Errors
		error: { level: 4 },
		fatal: { level: 4 },

		// Level 5: Debug information
		debug: { level: 5 },

		// Level 6: Trace and verbose information (cache operations, etc.)
		trace: { level: 6 },
		verbose: { level: 6 },
		log: { level: 6 },

		// Level 7: Trace and verbose information (cache operations, etc.)
		silent: { level: 7 },
	},
});

// Store the start time for progress tracking
let progressStartTime: Date | null = null;

/**
 * Formats a duration in milliseconds to a human-readable string (12h34m56s)
 * @param ms Duration in milliseconds
 * @returns Formatted time string
 */
function formatTime(ms: number): string {
	const duration = intervalToDuration({ start: 0, end: ms });

	// Custom formatting to get "12h34m54s" format
	const hours = duration.hours || 0;
	const minutes = duration.minutes || 0;
	const seconds = duration.seconds || 0;

	return `${hours}h${minutes}m${seconds}s`;
}

/**
 * Creates a progress bar string with time estimation
 * @param current Current progress value
 * @param total Total progress value
 * @param length Length of the progress bar
 * @param startTime Start time of the operation
 * @returns Progress bar string with time information
 */
function createProgressBar(
	current: number,
	total: number,
	length = 30,
	startTime: Date = new Date(),
): string {
	const progress = Math.min(Math.max(current / total, 0), 1);
	const filledLength = Math.round(length * progress);
	const emptyLength = length - filledLength;

	const progressBar = "█".repeat(filledLength) + "░".repeat(emptyLength);
	const percentage = Math.round(progress * 100);

	// Calculate elapsed time
	const now = new Date();
	const elapsedMs = now.getTime() - startTime.getTime();
	const elapsedStr = formatTime(elapsedMs);

	// Calculate estimated remaining time
	let remainingStr = "--h--m--s";
	let endTimeStr = "--h--m--s";
	if (current > 0 && progress > 0) {
		const msPerItem = elapsedMs / current;
		const remainingItems = total - current;
		const remainingMs = msPerItem * remainingItems;
		remainingStr = formatTime(remainingMs);

		// Estimated end time
		const endTime = new Date(now.getTime() + remainingMs);
		const endHours = endTime.getHours();
		const endMinutes = endTime.getMinutes();
		const endSeconds = endTime.getSeconds();
		endTimeStr = `${endHours}h${endMinutes}m${endSeconds}s`;
	}

	// Format start time
	const startHours = startTime.getHours();
	const startMinutes = startTime.getMinutes();
	const startSeconds = startTime.getSeconds();
	const startTimeStr = `${startHours}h${startMinutes}m${startSeconds}s`;

	return `[${progressBar}] ${current}/${total} (${percentage}%) | Début: ${startTimeStr} | Écoulé: ${elapsedStr} | Restant: ${remainingStr} | Fin estimée: ${endTimeStr}`;
}

/**
 * Updates the progress bar in place (overwrites the current line)
 * @param current Current progress value
 * @param total Total progress value
 * @param length Length of the progress bar
 */
export function updateProgressBar(
	current: number,
	total: number,
	length = 30,
): void {
	// Initialize start time if not set
	if (progressStartTime === null) {
		progressStartTime = new Date();
	}

	const progressBar = createProgressBar(
		current,
		total,
		length,
		progressStartTime,
	);
	// Add padding to ensure the line is fully cleared
	const padding = " ".repeat(20); // Add extra spaces to clear any artifacts
	process.stdout.write(`\r${progressBar}${padding}`);

	// If we've reached 100%, add a newline and reset the start time
	if (current >= total) {
		process.stdout.write("\n");
		progressStartTime = null;
	}
}
