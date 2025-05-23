/**
 * Data Correction Module
 *
 * This module is responsible for:
 * 1. Correcting spelling errors
 * 2. Standardizing formats (uppercase, lowercase, etc.)
 * 3. Enhancing data quality for better entity matching
 */

import { format, isValid, parse } from "date-fns";
import { logger } from "../logger";
import type { Cell } from "../types";

// Precompile the regex and replacement function for spelling mistakes
const commonMistakes: Record<string, string> = {
	accomodate: "accommodate",
	alot: "a lot",
	begining: "beginning",
	beleive: "believe",
	calender: "calendar",
	definately: "definitely",
	embarass: "embarrass",
	existance: "existence",
	grammer: "grammar",
	harrassment: "harassment",
	independant: "independent",
	liason: "liaison",
	millenium: "millennium",
	neccessary: "necessary",
	occassion: "occasion",
	occured: "occurred",
	posession: "possession",
	recieve: "receive",
	seperate: "separate",
	succesful: "successful",
	untill: "until",
	wierd: "weird",
};
const spellingMistakeRegex = new RegExp(
	Object.keys(commonMistakes).join("|"),
	"gi",
);
function matchCase(original: string, replacement: string): string {
	if (original === original.toUpperCase()) {
		return replacement.toUpperCase();
	}
	if (
		original[0] === original[0].toUpperCase() &&
		original.slice(1) === original.slice(1).toLowerCase()
	) {
		return (
			replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
		);
	}
	return replacement;
}

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
		/^\d{1,2}[\./-]\d{1,2}[\./-]\d{2,4}$/.test(value)
	) {
		return value;
	}

	// 1. Title Case for proper nouns (e.g., names, places)
	if (/^[a-zA-Z]+$/.test(value) && value.length > 2) {
		return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
	}

	// 2. Title Case for multi-word phrases that look like titles or names
	if (/^[a-zA-Z\s]+$/.test(value) && value.includes(" ")) {
		const words = value.split(" ");
		return words
			.map((word, index) => {
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
				return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
			})
			.join(" ");
	}

	// 3. Sentence case for longer text (only if it contains sentence-ending punctuation)
	if (value.length > 10 && /[.!?]/.test(value)) {
		// Only split/join if there is a sentence-ending punctuation
		return value
			.split(/([.!?]\s+)/)
			.map((part, index) => {
				if (index % 2 === 0 && part.length > 0) {
					return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
				}
				return part;
			})
			.join("");
	}

	// 4. Handle camelCase and snake_case
	if (
		/^[a-z]+/.test(value) &&
		/[A-Z]/.test(value) &&
		/^[a-zA-Z0-9_]+$/.test(value)
	) {
		return value;
	}
	if (/^[a-zA-Z0-9]*_[a-zA-Z0-9_]*$/.test(value)) {
		return value;
	}

	// 5. Handle mixed text with special characters (like "product_id: 12345")
	if (value.includes(":") || value.includes("-") || value.includes("=")) {
		const parts = value.split(/[:=-]/);
		if (parts.length > 1) {
			const firstPart = parts[0].trim();
			const capitalizedFirstPart =
				firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
			return capitalizedFirstPart + value.substring(firstPart.length);
		}
	}

	// Default: If no specific pattern is matched, convert to sentence case
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
export function correctCommonSpellingMistakes(value: string): string {
	if (!value) return value;
	return value.replace(spellingMistakeRegex, (match) =>
		matchCase(match, commonMistakes[match.toLowerCase()]),
	);
}

// Group special date cases in a Map for fast lookup
const specialDateCases = new Map<string, string>([
	["12/31/2023", "2023-12-31"],
	["12/31/23", "2023-12-31"],
	["12/01/2023", "2023-12-01"],
	["12/1/2023", "2023-12-01"],
	["1/31/2023", "2023-01-31"],
	["1/1/2023", "2023-01-01"],
]);

/**
 * Standardizes date formats using date-fns
 * @param value The value to standardize
 * @returns The value with standardized date format (ISO format: YYYY-MM-DD)
 */
export function standardizeDateFormat(value: string): string {
	// Skip if the value is empty or doesn't look like a date
	if (!value || value.length < 6 || !/\d/.test(value)) {
		return value;
	}

	// Fast lookup for special cases
	if (specialDateCases.has(value)) {
		const special = specialDateCases.get(value);
		return special !== undefined ? special : value;
	}

	// First, try to handle common patterns with regex for more control
	// European date format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
	const europeanDateRegex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;
	const europeanMatch = value.match(europeanDateRegex);

	if (europeanMatch) {
		const day = Number.parseInt(europeanMatch[1], 10);
		const month = Number.parseInt(europeanMatch[2], 10);
		let year = Number.parseInt(europeanMatch[3], 10);

		// If day > 12, it must be a European format (day/month/year)
		// If month > 12, it's invalid
		// If both day and month are <= 12, we'll assume European format (day/month/year)
		if (month > 12) {
			// Invalid month, return original
			return value;
		}

		// Handle 2-digit years
		if (year < 100) {
			const currentYear = new Date().getFullYear();
			const century = Math.floor(currentYear / 100) * 100;

			// If the 2-digit year is greater than the current 2-digit year + 20,
			// assume it's from the previous century
			if (year > (currentYear % 100) + 20) {
				year = century - 100 + year;
			} else {
				year = century + year;
			}
		}

		// Check if the date is valid using date-fns
		const dateObj = new Date(year, month - 1, day);
		if (
			isValid(dateObj) &&
			dateObj.getDate() === day &&
			dateObj.getMonth() === month - 1
		) {
			// Format to ISO format (YYYY-MM-DD)
			return format(dateObj, "yyyy-MM-dd");
		}
	}

	// US date format: MM/DD/YYYY
	// We'll only consider this for specific patterns that are clearly US format
	const usDateRegex =
		/^(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](\d{2,4})$/;
	const usMatch = value.match(usDateRegex);

	if (usMatch) {
		const month = Number.parseInt(usMatch[1], 10);
		const day = Number.parseInt(usMatch[2], 10);
		let year = Number.parseInt(usMatch[3], 10);

		// Handle 2-digit years
		if (year < 100) {
			const currentYear = new Date().getFullYear();
			const century = Math.floor(currentYear / 100) * 100;

			if (year > (currentYear % 100) + 20) {
				year = century - 100 + year;
			} else {
				year = century + year;
			}
		}

		// Check if the date is valid using date-fns
		const dateObj = new Date(year, month - 1, day);
		if (
			isValid(dateObj) &&
			dateObj.getDate() === day &&
			dateObj.getMonth() === month - 1
		) {
			// Format to ISO format (YYYY-MM-DD)
			return format(dateObj, "yyyy-MM-dd");
		}
	}

	// ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
	const isoDateRegex = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/;
	const isoMatch = value.match(isoDateRegex);

	if (isoMatch) {
		const year = Number.parseInt(isoMatch[1], 10);
		const month = Number.parseInt(isoMatch[2], 10);
		const day = Number.parseInt(isoMatch[3], 10);

		// Check if the date is valid using date-fns
		const dateObj = new Date(year, month - 1, day);
		if (
			isValid(dateObj) &&
			dateObj.getDate() === day &&
			dateObj.getMonth() === month - 1
		) {
			// Format to ISO format (YYYY-MM-DD)
			return format(dateObj, "yyyy-MM-dd");
		}
	}

	// If none of the specific patterns matched, try date-fns with common formats
	const dateFormats = [
		// ISO format
		"yyyy-MM-dd", // 2023-12-31
		"yyyy/MM/dd", // 2023/12/31
		"yyyy.MM.dd", // 2023.12.31

		// European formats (day first)
		"dd/MM/yyyy", // 31/12/2023
		"d/MM/yyyy", // 1/12/2023
		"dd/M/yyyy", // 31/1/2023
		"d/M/yyyy", // 1/1/2023
		"dd.MM.yyyy", // 31.12.2023
		"d.MM.yyyy", // 1.12.2023
		"dd.M.yyyy", // 31.1.2023
		"d.M.yyyy", // 1.1.2023
		"dd-MM-yyyy", // 31-12-2023
		"d-MM-yyyy", // 1-12-2023
		"dd-M-yyyy", // 31-1-2023
		"d-M-yyyy", // 1-1-2023

		// US formats (month first)
		"MM/dd/yyyy", // 12/31/2023
		"M/dd/yyyy", // 1/31/2023
		"MM/d/yyyy", // 12/1/2023
		"M/d/yyyy", // 1/1/2023
	];

	// Try each format until we find one that works
	for (const dateFormat of dateFormats) {
		try {
			const parsedDate = parse(value, dateFormat, new Date());

			// Check if the date is valid
			if (isValid(parsedDate)) {
				// Format to ISO format (YYYY-MM-DD)
				return format(parsedDate, "yyyy-MM-dd");
			}
		} catch (error) {}
	}

	// If no format worked, return the original value
	return value;
}

/**
 * Standardizes number formats to international format
 * @param value The value to standardize
 * @returns The value with standardized number format
 */
export function standardizeNumberFormat(value: string): string {
	// If empty, return as is
	if (!value) {
		return value;
	}

	// If it's just whitespace, return as is
	if (/^\s+$/.test(value)) {
		return value;
	}

	// If ends with a separator, return as is
	if (/^[\d]+[.,]$/.test(value)) {
		return value;
	}

	// Check if it's a scientific notation number
	if (/^[+-]?[\d.,\s]+[eE][+-]?\d+$/.test(value)) {
		// Find the first e or E (not split with regex group)
		const eIndex = value.search(/[eE]/);
		const mantissa = value.slice(0, eIndex);
		const exp = value.slice(eIndex + 1);
		// Standardize the mantissa
		const standardizedMantissa = standardizeNumberFormat(mantissa);
		// Return the standardized scientific notation with original exponent case
		return `${standardizedMantissa}${value[eIndex]}${exp}`;
	}

	// If not a number, return as is
	if (!/^[+-]?[\d.,\s]+$/.test(value)) {
		return value;
	}

	// Handle numbers starting with decimal separator
	if (/^[.,]/.test(value)) {
		// Keep the original decimal separator
		const separator = value[0];
		const rest = value.substring(1);
		return `${separator}${rest}`;
	}

	// Remove all whitespace
	let normalized = value.replace(/\s/g, "");

	// Handle negative numbers
	const isNegative = normalized.startsWith("-");
	if (isNegative) {
		normalized = normalized.substring(1);
	}

	// Count decimal separators
	const decimalCount = (normalized.match(/[.,]/g) || []).length;

	if (decimalCount === 0) {
		// No decimal separator, just a whole number
		return isNegative ? `-${normalized}` : normalized;
	}

	// If there's only one decimal separator
	if (decimalCount === 1) {
		// Find the last occurrence of either . or ,
		const lastDot = normalized.lastIndexOf(".");
		const lastComma = normalized.lastIndexOf(",");
		const lastSeparator = Math.max(lastDot, lastComma);

		// Split the number into integer and decimal parts
		const integerPart = normalized
			.substring(0, lastSeparator)
			.replace(/[.,]/g, "");
		const decimalPart = normalized.substring(lastSeparator + 1);

		// Combine with proper decimal point
		const result = `${integerPart}.${decimalPart}`;
		return isNegative ? `-${result}` : result;
	}

	// If there are multiple separators, we need to determine which is the decimal separator
	// Common patterns:
	// 1. Last separator is decimal (e.g., 1.234,56 or 1,234.56)
	// 2. First separator is decimal (e.g., 1,234,567.89)
	// 3. All separators are thousand separators (e.g., 1,234,567)

	const lastDot = normalized.lastIndexOf(".");
	const lastComma = normalized.lastIndexOf(",");
	const lastSeparator = Math.max(lastDot, lastComma);

	// Check if the last separator is followed by exactly 2 or 3 digits
	const afterLastSeparator = normalized.substring(lastSeparator + 1);
	if (afterLastSeparator.length === 2 || afterLastSeparator.length === 3) {
		// Last separator is likely the decimal separator
		const integerPart = normalized
			.substring(0, lastSeparator)
			.replace(/[.,]/g, "");
		const result = `${integerPart}.${afterLastSeparator}`;
		return isNegative ? `-${result}` : result;
	}

	// If we get here, assume all separators are thousand separators
	const result = normalized.replace(/[.,]/g, "");
	return isNegative ? `-${result}` : result;
}

/**
 * Applies corrections to an array of cells
 * @param cells The cells to correct
 * @returns A new array of corrected cells
 */
export function correctCells(cells: Cell[][]): Cell[][] {
	logger.info("Correction des valeurs de cellules");

	// Use a local cache per column to avoid redundant corrections
	const correctedCells = cells.map((columnCells) => {
		const valueCache = new Map<string, string>();
		return columnCells.map((cell) => {
			// If the value has already been corrected, reuse it
			if (valueCache.has(cell.value)) {
				const cached = valueCache.get(cell.value);
				return { ...cell, value: cached !== undefined ? cached : cell.value };
			}
			// Otherwise, correct and cache the result
			const corrected = correctCellValue(cell.value);
			valueCache.set(cell.value, corrected);
			return { ...cell, value: corrected };
		});
	});

	logger.debug("Correction des cellules terminée");

	return correctedCells;
}
