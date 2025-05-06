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
import type { CSVTable, CTAConfig, Cell } from "../types";

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
		logger.start(`Chargement du fichier CSV depuis ${filePath}`);

		const content = await Bun.file(filePath).text();
		const lines = content
			.split(/\r?\n/)
			.filter((line) => line.trim().length > 0);

		if (lines.length === 0) {
			throw new Error("CSV file is empty");
		}

		// Parse CSV lines properly handling quoted values
		const parseCSVLine = (line: string): string[] => {
			const result: string[] = [];
			let currentValue = "";
			let insideQuotes = false;

			for (let i = 0; i < line.length; i++) {
				const char = line[i];

				// Handle quotes
				if (char === '"') {
					// Check if this is an escaped quote (double quote inside quoted value)
					if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
						currentValue += '"';
						i++; // Skip the next quote
					} else {
						// Toggle quote state
						insideQuotes = !insideQuotes;
					}
				}
				// Handle delimiter
				else if (char === delimiter && !insideQuotes) {
					result.push(currentValue.trim());
					currentValue = "";
				}
				// Handle normal character
				else {
					currentValue += char;
				}
			}

			// Add the last value
			result.push(currentValue.trim());
			return result;
		};

		const headers = hasHeader
			? parseCSVLine(lines[0])
			: parseCSVLine(lines[0]).map((_, i) => `Column${i + 1}`);

		const data = (hasHeader ? lines.slice(1) : lines).map(parseCSVLine);

		logger.success(
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
 * Cleans the data in a CSV table by removing extra spaces,
 * normalizing special characters, and handling missing values
 * @param table The CSV table to clean
 * @returns A new cleaned CSV table
 */
export function cleanCSVData(table: CSVTable): CSVTable {
	logger.start("Nettoyage des données CSV");

	const cleanedData = table.data.map((row) =>
		row.map((cell) => cleanCellValue(cell)),
	);

	logger.success("Nettoyage des données CSV terminé");

	return {
		headers: table.headers,
		data: cleanedData,
	};
}

/**
 * Cleans a single cell value
 * @param value The cell value to clean
 * @returns The cleaned cell value
 */
export function cleanCellValue(value: string): string {
	// Remove extra spaces
	let cleaned = value.trim().replace(/\s+/g, " ");

	// Normalize special characters (accents, diacritics)
	cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	// Handle empty values
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
 * @param config Optional configuration for sampling
 * @returns Array of Cell objects
 */
export function extractCells(table: CSVTable, config?: CTAConfig): Cell[][] {
	const sampleSize = config?.sampleSize || table.data.length;
	const actualSampleSize = Math.min(sampleSize, table.data.length);

	logger.info(
		`Extraction des cellules avec un échantillon de : ${actualSampleSize} lignes`,
	);

	// Create a cells array for each column
	const columnCells: Cell[][] = Array.from(
		{ length: table.headers.length },
		() => [],
	);

	// If we're sampling and have more rows than the sample size,
	// select rows randomly but ensure we have a representative sample
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

	logger.success(
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
