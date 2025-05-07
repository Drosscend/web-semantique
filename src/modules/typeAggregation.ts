/**
 * Type Aggregation and Voting Module
 *
 * This module is responsible for:
 * 1. Selecting the final type for each column
 * 2. Taking into account the relationships between columns
 * 3. Weighting based on confidence scores
 * 4. Producing the final result of annotation
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
		logger.start(`Agrégation des types pour ${columnTypes.length} colonnes`);

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

			logger.success(
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
