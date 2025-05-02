/**
 * Data Correction Module
 *
 * This module is responsible for:
 * 1. Correcting spelling errors
 * 2. Standardizing formats (uppercase, lowercase, etc.)
 * 3. Enhancing data quality for better entity matching
 */

import { consola } from "consola";
import type { CSVTable, Cell } from "../types";

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
 * @param value The value to standardize
 * @returns The value with standardized capitalization
 */
function standardizeCapitalization(value: string): string {
	// Skip if the value is all uppercase (likely an acronym)
	if (value === value.toUpperCase() && value.length > 1) {
		return value;
	}

	// TODO: Implement a more sophisticated capitalization algorithm

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
	// Check if the value looks like a date
	const dateRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/;
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
			cleanedValue: cell.cleanedValue
				? correctCellValue(cell.cleanedValue)
				: correctCellValue(cell.value),
		})),
	);

	consola.success("Correction des cellules terminée");

	return correctedCells;
}

