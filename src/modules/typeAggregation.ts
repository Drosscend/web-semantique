/**
 * Type Aggregation and Voting Module
 *
 * This module is responsible for:
 * 1. Selecting the final type for each column
 * 2. Taking into account the relationships between columns
 * 3. Weighting based on confidence scores
 * 4. Prioritizing Wikidata types over DBpedia types
 * 5. Producing the final result of annotation
 */

import {
	DEFAULT_TYPE_AGGREGATION_CONFIG,
	type TypeAggregationConfig,
} from "../config";
import { logger } from "../logger";
import type {
	ColumnRelation,
	ColumnTypeAnnotation,
	TypeCandidate,
} from "../types";
import { KNOWN_TYPE_RELATIONSHIPS } from "./columnRelationship";
import { TypeMappingService } from "./typeMapping";

/**
 * Service for aggregating and voting on column types
 */
export class TypeAggregationService {
	private config: TypeAggregationConfig;

	/**
	 * Creates a new type aggregation service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<TypeAggregationConfig> = {}) {
		this.config = { ...DEFAULT_TYPE_AGGREGATION_CONFIG, ...config };
		logger.debug(
			"Service d'agrégation de types initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Aggregates type candidates to determine the final type for each column
	 * @param columnTypes The type candidates for each column
	 * @param columnHeaders The headers for each column
	 * @param columnRelations Optional column relations
	 * @returns The final column type annotations
	 */
	aggregateColumnTypes(
		columnTypes: TypeCandidate[][],
		columnHeaders: string[],
		columnRelations: ColumnRelation[] = [],
	): ColumnTypeAnnotation[] {
		logger.info(`Agrégation des types pour ${columnTypes.length} colonnes`);

		const annotations: ColumnTypeAnnotation[] = [];

		// Process each column
		for (let i = 0; i < columnTypes.length; i++) {
			const typeCandidates = columnTypes[i];
			const header =
				i < columnHeaders.length ? columnHeaders[i] : `Column${i + 1}`;

			// Skip empty columns
			if (typeCandidates.length === 0) {
				logger.warn(
					`Aucun candidat de type pour la colonne ${header}, ignorée`,
				);
				continue;
			}

			// Clone the candidates to avoid modifying the originals
			const adjustedCandidates = typeCandidates.map((candidate) => ({
				...candidate,
			}));

			// Apply relationship boosts
			this.applyRelationshipBoosts(
				adjustedCandidates,
				i,
				columnTypes,
				columnRelations,
			);

			// Prioritize Wikidata types
			this.prioritizeWikidataTypes(adjustedCandidates);

			// Sort by adjusted confidence
			adjustedCandidates.sort((a, b) => b.confidence - a.confidence);

			// Select the best type
			const bestType = adjustedCandidates[0];

			// Create the annotation
			const annotation: ColumnTypeAnnotation = {
				columnIndex: i,
				columnHeader: header,
				assignedType: bestType.type,
				confidence: bestType.confidence,
				alternativeTypes: adjustedCandidates.slice(1),
			};

			annotations.push(annotation);

			logger.debug(
				`Colonne "${header}" annotée comme "${bestType.type.label}" avec une confiance de ${bestType.confidence.toFixed(2)}`,
			);
		}

		return annotations;
	}

	/**
	 * Applies relationship boosts to type candidates
	 * @param candidates The type candidates to adjust
	 * @param columnIndex The index of the current column
	 * @param allColumnTypes The type candidates for all columns
	 * @param columnRelations The column relations
	 */
	private applyRelationshipBoosts(
		candidates: TypeCandidate[],
		columnIndex: number,
		allColumnTypes: TypeCandidate[][],
		columnRelations: ColumnRelation[],
	): void {
		// Find relations involving this column
		const relevantRelations = columnRelations.filter(
			(relation) =>
				relation.sourceColumnIndex === columnIndex ||
				relation.targetColumnIndex === columnIndex,
		);

		if (relevantRelations.length === 0) return;

		logger.debug(
			`Application des améliorations de relation pour la colonne ${columnIndex} basées sur ${relevantRelations.length} relations`,
		);

		// For each relation
		for (const relation of relevantRelations) {
			// Determine the other column in the relation
			const otherColumnIndex =
				relation.sourceColumnIndex === columnIndex
					? relation.targetColumnIndex
					: relation.sourceColumnIndex;

			// Skip if the other column is out of bounds
			if (otherColumnIndex >= allColumnTypes.length) continue;

			const otherColumnCandidates = allColumnTypes[otherColumnIndex];

			// Skip if the other column has no candidates
			if (otherColumnCandidates.length === 0) continue;

			// Get the best type from the other column
			const otherBestType = otherColumnCandidates.reduce(
				(best, current) =>
					current.confidence > best.confidence ? current : best,
				otherColumnCandidates[0],
			);

			// Boost candidates that are compatible with the relation
			for (const candidate of candidates) {
				if (
					this.areTypesCompatibleWithRelation(
						candidate.type.uri,
						otherBestType.type.uri,
						relation.relationType,
						relation.sourceColumnIndex === columnIndex,
					)
				) {
					// Apply a boost based on the relation confidence
					const boost = this.config.relationBoostFactor * relation.confidence;
					candidate.confidence = Math.min(1.0, candidate.confidence + boost);

					logger.debug(
						`Confiance améliorée pour le type "${candidate.type.label}" de ${boost.toFixed(2)} basée sur la relation avec la colonne ${otherColumnIndex}`,
					);
				}
			}
		}
	}

	/**
	 * Ensures only Wikidata types are used, converting DBpedia types to Wikidata if necessary
	 * @param candidates The type candidates to adjust
	 */
	private prioritizeWikidataTypes(candidates: TypeCandidate[]): void {
		// Check if there are any Wikidata types
		const wikidataTypes = candidates.filter(
			(candidate) => candidate.type.source === "Wikidata",
		);

		// Check if there are any DBpedia types
		const dbpediaTypes = candidates.filter(
			(candidate) => candidate.type.source === "DBpedia",
		);

		// If there are no candidates at all, return
		if (candidates.length === 0) {
			return;
		}

		// If there are Wikidata types, keep only them and remove DBpedia types
		if (wikidataTypes.length > 0) {
			// Find the highest confidence Wikidata type
			const bestWikidataType = wikidataTypes.reduce(
				(best, current) =>
					current.confidence > best.confidence ? current : best,
				wikidataTypes[0],
			);

			// Remove all non-Wikidata types from the candidates array
			// We use splice to modify the original array in-place
			for (let i = candidates.length - 1; i >= 0; i--) {
				if (candidates[i].type.source !== "Wikidata") {
					candidates.splice(i, 1);
				}
			}

			// Boost the confidence of all remaining Wikidata types
			for (const candidate of candidates) {
				// Boost Wikidata types to ensure they are properly prioritized
				candidate.confidence = Math.min(1.0, candidate.confidence + 0.2);
			}

			logger.debug(
				`Utilisation exclusive des types Wikidata pour la colonne. Meilleur type Wikidata: "${bestWikidataType.type.label}" avec une confiance de ${bestWikidataType.confidence.toFixed(2)}`,
			);
		}
		// If there are only DBpedia types, convert them to Wikidata types
		else if (dbpediaTypes.length > 0) {
			logger.debug(
				"Aucun type Wikidata trouvé pour la colonne. Conversion des types DBpedia en types Wikidata.",
			);

			// Create a TypeMappingService to find Wikidata equivalents
			const typeMappingService = new TypeMappingService();

			// Create a new array to hold the converted Wikidata types
			const convertedTypes: TypeCandidate[] = [];

			// Process each DBpedia type
			for (const dbpediaCandidate of dbpediaTypes) {
				// Use the TypeMappingService to directly convert DBpedia types to Wikidata types
				const wikidataTypes = typeMappingService.convertDbpediaTypeToWikidata(
					dbpediaCandidate.type,
				);

				if (wikidataTypes.length > 0) {
					// For each Wikidata type, create a new TypeCandidate
					for (const wikidataType of wikidataTypes) {
						convertedTypes.push({
							type: wikidataType,
							score: dbpediaCandidate.score,
							entityMatches: dbpediaCandidate.entityMatches,
							confidence: dbpediaCandidate.confidence,
						});
					}
				}
			}

			// If any Wikidata types were found, replace the candidates array with them
			if (convertedTypes.length > 0) {
				// Clear the original candidates array
				candidates.length = 0;

				// Add the converted Wikidata types
				for (const convertedType of convertedTypes) {
					candidates.push(convertedType);
				}

				// Sort by confidence
				candidates.sort((a, b) => b.confidence - a.confidence);

				logger.debug(
					`${convertedTypes.length} types Wikidata convertis à partir de types DBpedia.`,
				);
			} else {
				logger.warn(
					"Impossible de trouver des équivalents Wikidata pour les types DBpedia.",
				);

				// If no Wikidata types were found through mapping, we don't create placeholder types
				// Instead, we clear the candidates array as we only want Wikidata types
				candidates.length = 0;
			}
		}
	}

	/**
	 * Checks if two types are compatible with a relation
	 * @param typeUri1 The URI of the first type
	 * @param typeUri2 The URI of the second type
	 * @param relationType The type of relation
	 * @param isSource Whether the first type is the source of the relation
	 * @returns True if the types are compatible with the relation
	 */
	private areTypesCompatibleWithRelation(
		typeUri1: string,
		typeUri2: string,
		relationType?: string,
		isSource = true,
	): boolean {
		// If no relation type is specified, assume compatibility
		if (!relationType) return true;

		// Generate compatible type pairs from KNOWN_TYPE_RELATIONSHIPS
		const compatibleTypePairs: Record<
			string,
			Array<[string, string]>
		> = KNOWN_TYPE_RELATIONSHIPS.reduce(
			(acc, relation) => {
				if (!acc[relation.relationName]) {
					acc[relation.relationName] = [];
				}
				acc[relation.relationName].push([
					relation.sourceType,
					relation.targetType,
				]);
				return acc;
			},
			{} as Record<string, Array<[string, string]>>,
		);

		// Check if the relation type is known
		if (!(relationType in compatibleTypePairs)) return true;

		// Get the compatible type pairs for this relation
		const pairs = compatibleTypePairs[relationType];

		// Check if the types match any of the compatible pairs
		for (const [sourceType, targetType] of pairs) {
			if (isSource) {
				if (typeUri1 === sourceType && typeUri2 === targetType) return true;
			} else {
				if (typeUri1 === targetType && typeUri2 === sourceType) return true;
			}
		}

		return false;
	}
}

/**
 * Creates a new type aggregation service with default configuration
 * @returns A new type aggregation service
 */
export function createTypeAggregationService(): TypeAggregationService {
	return new TypeAggregationService();
}

/**
 * Aggregates type candidates to determine the final type for each column
 * @param columnTypes The type candidates for each column
 * @param columnHeaders The headers for each column
 * @param columnRelations Optional column relations
 * @returns The final column type annotations
 */
export function aggregateColumnTypes(
	columnTypes: TypeCandidate[][],
	columnHeaders: string[],
	columnRelations: ColumnRelation[] = [],
): ColumnTypeAnnotation[] {
	const service = createTypeAggregationService();
	return service.aggregateColumnTypes(
		columnTypes,
		columnHeaders,
		columnRelations,
	);
}
