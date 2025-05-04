/**
 * Data Correction Module
 *
 * This module is responsible for:
 * 1. Correcting spelling errors
 * 2. Standardizing formats (uppercase, lowercase, etc.)
 * 3. Enhancing data quality for better entity matching
 */

import { consola } from "consola";
import type { Cell } from "../types";

/**
 * Corrects a single cell value
 * @param value The cell value to correct
 * @returns The corrected cell value
 */
export function correctCellValue(value: string): string {
	if (!value.trim()) return value;

	// Apply a series of corrections
	let corrected = value;

	// Standardize capitalization for proper nouns
	corrected = standardizeCapitalization(corrected);

	// Correct common spelling mistakes
	corrected = correctCommonSpellingMistakes(corrected);

	// Standardize date formats if applicable
	corrected = standardizeDateFormat(corrected);

	// Standardize number formats if applicable
	corrected = standardizeNumberFormat(corrected);

	return corrected;
}

/**
 * Standardizes capitalization based on common patterns
 * This function detects and handles various text patterns:
 * 1. Acronyms (all uppercase) - preserved as is
 * 2. Numbers and dates - preserved as is
 * 3. camelCase and snake_case identifiers - preserved as is
 * 4. Proper nouns - converted to Title Case
 * 5. Titles - converted to Title Case with small words in lowercase
 * 6. Sentences - converted to Sentence case
 * 7. Mixed text with special characters - handled appropriately
 *
 * @param value The value to standardize
 * @returns The value with standardized capitalization
 */
export function standardizeCapitalization(value: string): string {
	// Skip if the value is all uppercase (likely an acronym)
	if (value === value.toUpperCase() && value.length > 1) {
		return value;
	}

	// Skip if the value is a number or date
	if (
		/^\d+(\.\d+)?$/.test(value) ||
		/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(value)
	) {
		return value;
	}

	// Patterns to standardize capitalization

	// 1. Title Case for proper nouns (e.g., names, places)
	// Words that should be capitalized as proper nouns
	if (/^[a-zA-Z]+$/.test(value) && value.length > 2) {
		// Single word that looks like a proper noun
		return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
	}

	// 2. Title Case for multi-word phrases that look like titles or names
	if (/^[a-zA-Z\s]+$/.test(value) && value.includes(" ")) {
		const words = value.split(" ");
		return words
			.map((word, index) => {
				// Skip small words in titles (articles, conjunctions, prepositions)
				// EXCEPT for the first word which should always be capitalized
				const smallWords = [
					"a",
					"an",
					"the",
					"and",
					"but",
					"or",
					"for",
					"nor",
					"on",
					"at",
					"to",
					"from",
					"by",
					"with",
					"in",
					"of",
					"de",
					"du",
					"la",
					"le",
					"les",
					"des",
					"un",
					"une",
				];

				if (
					index > 0 &&
					(word.length <= 2 || smallWords.includes(word.toLowerCase()))
				) {
					return word.toLowerCase();
				}

				// Capitalize first letter of other words and the first word
				return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
			})
			.join(" ");
	}

	// 3. Sentence case for longer text
	if (value.length > 10 && /[.!?]/.test(value)) {
		// Split by sentence endings
		return value
			.split(/([.!?]\s+)/)
			.map((part, index) => {
				// If it's a sentence start, capitalize first letter
				if (index % 2 === 0 && part.length > 0) {
					return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
				}
				return part;
			})
			.join("");
	}

	// 4. Handle camelCase and snake_case
	// Check for camelCase pattern (lowercase start, then at least one uppercase letter)
	// This needs to be checked before any other transformations
	// 1. Starts with lowercase letter(s)
	// 2. Contains at least one uppercase letter
	// 3. No spaces or special characters (except underscores)
	if (
		/^[a-z]+/.test(value) &&
		/[A-Z]/.test(value) &&
		/^[a-zA-Z0-9_]+$/.test(value)
	) {
		// This is a camelCase identifier, preserve it exactly as is
		return value;
	}

	// Check for snake_case pattern
	if (/^[a-zA-Z0-9]*_[a-zA-Z0-9_]*$/.test(value)) {
		// This is a snake_case identifier, preserve it exactly as is
		return value;
	}

	// 5. Handle mixed text with special characters (like "product_id: 12345")
	if (value.includes(":") || value.includes("-") || value.includes("=")) {
		// For key-value pairs or similar patterns, capitalize the first part
		const parts = value.split(/[:=-]/);
		if (parts.length > 1) {
			const firstPart = parts[0].trim();
			// Apply sentence case to the first part
			const capitalizedFirstPart =
				firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
			// Join back with the rest of the parts
			return capitalizedFirstPart + value.substring(firstPart.length);
		}
	}

	// Default: If no specific pattern is matched, convert to sentence case
	// (first letter uppercase, rest lowercase)
	if (value.length > 0) {
		return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
	}

	return value;
}

/**
 * Corrects common spelling mistakes
 * @param value The value to correct
 * @returns The corrected value
 */
function correctCommonSpellingMistakes(value: string): string {
	// TODO: Implement a more sophisticated spell-checking algorithm

	return value;
}

/**
 * Standardizes date formats
 * @param value The value to standardize
 * @returns The value with standardized date format
 */
function standardizeDateFormat(value: string): string {
	// TODO: Implement a more sophisticated date format standardization algorithm with date-fns maybe
	// Check if the value looks like a date
	const dateRegex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;
	const match = value.match(dateRegex);

	if (match) {
		const day = match[1].padStart(2, "0");
		const month = match[2].padStart(2, "0");
		let year = match[3];

		// Handle 2-digit years
		if (year.length === 2) {
			const currentYear = new Date().getFullYear();
			const century = Math.floor(currentYear / 100) * 100;
			const twoDigitYear = Number.parseInt(year, 10);

			// If the 2-digit year is greater than the current 2-digit year + 20,
			// assume it's from the previous century
			if (twoDigitYear > (currentYear % 100) + 20) {
				year = String(century - 100 + twoDigitYear);
			} else {
				year = String(century + twoDigitYear);
			}
		}

		// Return ISO format (YYYY-MM-DD)
		return `${year}-${month}-${day}`;
	}

	return value;
}

/**
 * Standardizes number formats
 * @param value The value to standardize
 * @returns The value with standardized number format
 */
function standardizeNumberFormat(value: string): string {
	// Check if the value is a number
	if (/^[\d.,]+$/.test(value)) {
		// Remove thousands separators and standardize decimal separator
		const normalized = value.replace(/,/g, ".");

		// If there are multiple decimal points, keep only the first one
		const parts = normalized.split(".");
		if (parts.length > 2) {
			return `${parts[0]}.${parts.slice(1).join("")}`;
		}

		return normalized;
	}

	return value;
}

/**
 * Applies corrections to an array of cells
 * @param cells The cells to correct
 * @returns A new array of corrected cells
 */
export function correctCells(cells: Cell[][]): Cell[][] {
	consola.start("Correction des valeurs de cellules");

	const correctedCells = cells.map((columnCells) =>
		columnCells.map((cell) => ({
			...cell,
			value: correctCellValue(cell.value),
		})),
	);

	consola.success("Correction des cellules terminée");

	return correctedCells;
}
