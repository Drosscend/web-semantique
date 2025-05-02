/**
 * URI Analysis Module
 *
 * This module is responsible for:
 * 1. Searching for values of other columns in the URIs of entities
 * 2. Using this information to reinforce confidence in entity matches
 * 3. Extracting additional context from URIs to improve type detection
 */

import { consola } from "consola";
import type { EntityCandidate } from "../types";

/**
 * Configuration for URI analysis
 */
interface URIAnalysisConfig {
	confidenceBoost: number;
	minMatchLength: number;
}

/**
 * Default configuration for URI analysis
 */
const DEFAULT_CONFIG: URIAnalysisConfig = {
	confidenceBoost: 0.2,
	minMatchLength: 3,
};

/**
 * Service for analyzing URIs to improve entity matching
 */
export class URIAnalysisService {
	private config: URIAnalysisConfig;

	/**
	 * Creates a new URI analysis service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<URIAnalysisConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		consola.debug("Service d'analyse d'URI initialisé avec la configuration :", this.config);
	}

	/**
	 * Analyzes URIs of entity candidates to improve matching
	 * @param columnCandidates The entity candidates for each column
	 * @returns Enhanced entity candidates
	 */
	analyzeURIs(columnCandidates: EntityCandidate[][]): EntityCandidate[][] {
		consola.start(`Analyse des URI pour ${columnCandidates.length} colonnes`);

		// Clone the candidates to avoid modifying the originals
		const enhancedCandidates = columnCandidates.map((column) =>
			column.map((candidate) => ({ ...candidate })),
		);

		// For each column
		for (let i = 0; i < enhancedCandidates.length; i++) {
			const currentColumn = enhancedCandidates[i];

			// For each candidate in the current column
			for (let j = 0; j < currentColumn.length; j++) {
				const candidate = currentColumn[j];
				// Ensure uri exists and is a string
				if (
					!candidate.entity?.uri ||
					typeof candidate.entity.uri !== "string"
				) {
					continue;
				}
				const uri = candidate.entity.uri.toLowerCase();

				// Check for matches with values from other columns
				for (let k = 0; k < enhancedCandidates.length; k++) {
					// Skip the current column
					if (k === i) continue;

					const otherColumn = enhancedCandidates[k];

					// Find candidates in the other column that are in the same row
					const sameRowCandidates = otherColumn.filter(
						(c) => c.cell.rowIndex === candidate.cell.rowIndex,
					);

					for (const otherCandidate of sameRowCandidates) {
						const value = (
							otherCandidate.cell.cleanedValue || otherCandidate.cell.value
						).toLowerCase();

						// Skip short values
						if (value.length < this.config.minMatchLength) continue;

						// Check if the value appears in the URI
						if (this.containsValue(uri, value)) {
							// Boost the confidence of this candidate
							candidate.score = Math.min(
								1.0,
								candidate.score + this.config.confidenceBoost,
							);
							consola.debug(
								`Confiance augmentée pour "${candidate.entity.label}" basée sur la correspondance URI avec "${value}"`,
							);
							break;
						}
					}
				}
			}
		}

		consola.success("Analyse des URI terminée");
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

	/**
	 * Extracts additional information from URIs
	 * @param candidates The entity candidates
	 * @returns Enhanced entity candidates with additional information
	 */
	extractInfoFromURIs(candidates: EntityCandidate[]): EntityCandidate[] {
		consola.start(
			`Extraction d'informations supplémentaires des URI pour ${candidates.length} candidats`,
		);

		// Clone the candidates to avoid modifying the originals
		const enhancedCandidates = candidates.map((candidate) => {
			// Ensure entity and uri exist and uri is a string
			if (candidate.entity?.uri && typeof candidate.entity.uri === "string") {
				// Extract information from the URI
				const uri = candidate.entity.uri;
				const uriParts = uri.split(/[/#]/);
				const lastPart = uriParts[uriParts.length - 1];

				// For Wikidata URIs, extract the entity ID
				if (uri.includes("wikidata.org/entity/")) {
					const entityId = lastPart;
					consola.debug(
						`ID d'entité Wikidata extrait : ${entityId} de ${uri}`,
					);
				}

				// For DBpedia URIs, extract the resource name
				if (uri.includes("dbpedia.org/resource/")) {
					const resourceName = decodeURIComponent(lastPart);
					consola.debug(
						`Nom de ressource DBpedia extrait : ${resourceName} de ${uri}`,
					);
				}
			}

			return candidate;
		});

		consola.success("URI information extraction completed");
		return enhancedCandidates;
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

/**
 * Extracts additional information from URIs
 * @param candidates The entity candidates
 * @returns Enhanced entity candidates with additional information
 */
export function extractInfoFromURIs(
	candidates: EntityCandidate[],
): EntityCandidate[] {
	const service = createURIAnalysisService();
	return service.extractInfoFromURIs(candidates);
}
