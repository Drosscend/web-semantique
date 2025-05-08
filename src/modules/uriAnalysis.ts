/**
 * URI Analysis Module
 *
 * This module is responsible for:
 * 1. Searching for values of other columns in the URIs of entities
 * 2. Using this information to reinforce confidence in entity matches
 * 3. Extracting additional context from URIs to improve type detection
 */

import { DEFAULT_URI_ANALYSIS_CONFIG, type URIAnalysisConfig } from "../config";
import { logger } from "../logger";
import type { EntityCandidate } from "../types";

/**
 * Service for analyzing URIs to improve entity matching
 */
class URIAnalysisService {
	private config: URIAnalysisConfig;

	/**
	 * Creates a new URI analysis service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<URIAnalysisConfig> = {}) {
		this.config = { ...DEFAULT_URI_ANALYSIS_CONFIG, ...config };
		logger.debug(
			"Service d'analyse d'URI initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Analyzes URIs of entity candidates to improve matching
	 * @param columnCandidates The entity candidates for each column
	 * @returns Enhanced entity candidates
	 */
	analyzeURIs(columnCandidates: EntityCandidate[][]): EntityCandidate[][] {
		logger.info(`Analyse des URI pour ${columnCandidates.length} colonnes`);

		// Clone the candidates to avoid modifying the originals
		const enhancedCandidates = columnCandidates.map((column) =>
			column.map((candidate) => ({ ...candidate })),
		);

		// Local cache: Map<uri+rowIndex, Set<matchedValues>>
		const matchCache = new Map<string, Set<string>>();

		// For each column
		for (let i = 0; i < enhancedCandidates.length; i++) {
			const currentColumn = enhancedCandidates[i];

			// For each candidate in the current column
			for (let j = 0; j < currentColumn.length; j++) {
				const candidate = currentColumn[j];
				if (!candidate.entity?.uri || typeof candidate.entity.uri !== "string") {
					continue;
				}
				const uri = candidate.entity.uri.toLowerCase();
				const rowIndex = candidate.cell.rowIndex;
				const cacheKey = `${uri}#${rowIndex}`;

				let matched = false;
				let matchedValues = matchCache.get(cacheKey);
				if (!matchedValues) {
					matchedValues = new Set();
					matchCache.set(cacheKey, matchedValues);
				}

				// Check for matches with values from other columns
				for (let k = 0; k < enhancedCandidates.length; k++) {
					// Skip the current column
					if (k === i) continue;
					const otherColumn = enhancedCandidates[k];

					// Find candidates in the other column that are in the same row
					const sameRowCandidates = otherColumn.filter(
						(c) => c.cell.rowIndex === rowIndex,
					);
					for (const otherCandidate of sameRowCandidates) {
						const value = otherCandidate.cell.value.toLowerCase();
						if (value.length < this.config.minMatchLength) continue;
						// Precompile regex for value (alphanum only)
						const normalizedValue = this.normalizeForMatching(value);
						const lastPart = uri.split(/[/#]/).pop() || uri;
						const normalizedLastPart = this.normalizeForMatching(lastPart);
						const regex = new RegExp(normalizedValue, "i");
						if (normalizedValue && regex.test(normalizedLastPart)) {
							if (!matchedValues.has(normalizedValue)) {
								candidate.score = Math.min(
									1.0,
									candidate.score + this.config.confidenceBoost,
								);
								matchedValues.add(normalizedValue);
								logger.debug(
									`[Col ${i}, Row ${rowIndex}] URI match: "${candidate.entity.label}" boosted by value "${value}" (regex: ${regex})`,
								);
							}
							matched = true;
							break;
						}
					}
				}
				if (!matched) {
					logger.debug(
						`[Col ${i}, Row ${rowIndex}] No URI match for "${candidate.entity.label}" (uri: ${uri})`,
					);
				}
			}
		}

		logger.debug("Analyse des URI terminée");
		return enhancedCandidates;
	}

	/**
	 * Checks if a URI contains a value
	 * @param uri The URI to check
	 * @param value The value to look for
	 * @returns True if the URI contains the value
	 */
	private containsValue(uri: string, value: string): boolean {
		// Normalize the value for matching
		const normalizedValue = this.normalizeForMatching(value);

		// Extract the last part of the URI (after the last slash or hash)
		const uriParts = uri.split(/[/#]/);
		const lastPart = uriParts[uriParts.length - 1];

		// Normalize the last part for matching
		const normalizedLastPart = this.normalizeForMatching(lastPart);

		// Check if the normalized value is contained in the normalized last part
		return normalizedLastPart.includes(normalizedValue);
	}

	/**
	 * Normalizes a string for matching
	 * @param value The string to normalize
	 * @returns The normalized string
	 */
	private normalizeForMatching(value: string): string {
		// Remove special characters and convert to lowercase
		return value.toLowerCase().replace(/[^a-z0-9]/g, "");
	}
}

/**
 * Creates a new URI analysis service with default configuration
 * @returns A new URI analysis service
 */
export function createURIAnalysisService(): URIAnalysisService {
	return new URIAnalysisService();
}

/**
 * Analyzes URIs of entity candidates to improve matching
 * @param columnCandidates The entity candidates for each column
 * @returns Enhanced entity candidates
 */
export function analyzeURIs(
	columnCandidates: EntityCandidate[][],
): EntityCandidate[][] {
	const service = createURIAnalysisService();
	return service.analyzeURIs(columnCandidates);
}
