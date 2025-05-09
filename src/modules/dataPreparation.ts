/**
 * Data Preparation and Cleaning Module
 *
 * This module is responsible for:
 * 1. Loading CSV files
 * 2. Cleaning data (removing extra spaces, normalizing characters)
 * 3. Handling missing values
 * 4. Preparing the data for further processing
 */

import { logger } from "../logger";
import type { CSVTable, Config, Cell } from "../types";

/**
 * Loads a CSV file and returns a structured representation
 * @param filePath Path to the CSV file
 * @param delimiter CSV delimiter (default: ',')
 * @param hasHeader Whether the CSV has a header row (default: true)
 * @returns Promise resolving to a CSVTable object
 */
export async function loadCSV(
	filePath: string,
	delimiter = ",",
	hasHeader = true,
): Promise<CSVTable> {
	try {
		logger.info(`Chargement du fichier CSV depuis ${filePath}`);

		const content = await Bun.file(filePath).text();
		const lines = content
			.split(/\r?\n/)
			.filter((line) => line.trim().length > 0);

		if (lines.length === 0) {
			throw new Error("CSV file is empty");
		}

		// Parse a CSV line, handling quoted values and cleaning each cell
		const parseCSVLine = (line: string): string[] => {
			const result: string[] = [];
			let currentValue = "";
			let insideQuotes = false;

			for (let i = 0; i < line.length; i++) {
				const char = line[i];

				if (char === '"') {
					if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
						currentValue += '"';
						i++;
					} else {
						insideQuotes = !insideQuotes;
					}
				} else if (char === delimiter && !insideQuotes) {
					result.push(cleanCellValue(currentValue));
					currentValue = "";
				} else {
					currentValue += char;
				}
			}
			result.push(cleanCellValue(currentValue));
			return result;
		};

		const headers = hasHeader
			? parseCSVLine(lines[0])
			: parseCSVLine(lines[0]).map((_, i) => `Column${i + 1}`);

		const data = (hasHeader ? lines.slice(1) : lines).map(parseCSVLine);

		logger.debug(
			`Fichier CSV chargé avec succès : ${headers.length} colonnes et ${data.length} lignes`,
		);

		return { headers, data };
	} catch (error) {
		logger.error(
			`Échec du chargement du fichier CSV : ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

/**
 * Cleans a single cell value: trims spaces, normalizes special characters, and handles empty/null values
 * @param value The cell value to clean
 * @returns The cleaned cell value
 */
export function cleanCellValue(value: string): string {
	// Remove extra spaces
	let cleaned = value.trim().replace(/\s+/g, " ");

	// Normalize special characters (accents, diacritics)
	cleaned = cleaned.normalize("NFD").replace(/\p{Diacritic}/gu, "");

	// Handle empty or null-like values
	if (
		cleaned === "" ||
		cleaned.toLowerCase() === "null" ||
		cleaned.toLowerCase() === "n/a"
	) {
		return "";
	}

	return cleaned;
}

/**
 * Extracts cells from a CSV table for further processing
 * @param table The CSV table
 * @param config Optional configuration for sampling (sampleSize: undefined/0 = all rows)
 * @returns Array of Cell objects per column
 */
export function extractCells(table: CSVTable, config?: Config): Cell[][] {
	let sampleSize = config?.sampleSize;
	if (sampleSize === undefined || sampleSize === null || sampleSize <= 0) {
		sampleSize = table.data.length;
	}
	const actualSampleSize = Math.min(sampleSize, table.data.length);

	logger.debug(
		`Extraction des cellules avec un échantillon de : ${actualSampleSize} lignes`,
	);

	// Create an array for each column
	const columnCells: Cell[][] = Array.from(
		{ length: table.headers.length },
		() => [],
	);

	// Select row indices for sampling
	const rowIndices =
		actualSampleSize < table.data.length
			? getRepresentativeSampleIndices(table.data.length, actualSampleSize)
			: Array.from({ length: table.data.length }, (_, i) => i);

	// Extract cells from the selected rows
	for (const rowIndex of rowIndices) {
		const row = table.data[rowIndex];
		for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
			const value = row[columnIndex];
			// Skip empty values
			if (value.trim() === "") continue;
			columnCells[columnIndex].push({
				value,
				rowIndex,
				columnIndex,
			});
		}
	}

	logger.debug(
		`Cellules extraites de ${actualSampleSize} lignes à travers ${table.headers.length} colonnes`,
	);

	return columnCells;
}

/**
 * Gets a representative sample of row indices
 * This ensures we don't just take the first N rows, which might not be representative
 * @param totalRows Total number of rows
 * @param sampleSize Desired sample size
 * @returns Array of row indices
 */
function getRepresentativeSampleIndices(
	totalRows: number,
	sampleSize: number,
): number[] {
	// Always include the first and last rows for better representation
	const indices = new Set<number>([0, totalRows - 1]);

	// Add evenly distributed rows
	const step = Math.max(1, Math.floor(totalRows / sampleSize));

	for (let i = 0; indices.size < sampleSize && i < totalRows; i += step) {
		indices.add(i);
	}

	// If we still need more rows, add random ones
	while (indices.size < sampleSize) {
		const randomIndex = Math.floor(Math.random() * totalRows);
		indices.add(randomIndex);
	}

	return Array.from(indices).sort((a, b) => a - b);
}
