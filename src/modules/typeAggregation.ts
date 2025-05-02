/**
 * Type Aggregation and Voting Module
 *
 * This module is responsible for:
 * 1. Selecting the final type for each column
 * 2. Taking into account the relationships between columns
 * 3. Weighting based on confidence scores
 * 4. Producing the final result of annotation
 */

import { consola } from "consola";
import type {
	ColumnRelation,
	ColumnTypeAnnotation,
	TypeCandidate,
} from "../types";

/**
 * Configuration for type aggregation
 */
interface TypeAggregationConfig {
	minConfidenceThreshold: number;
	relationBoostFactor: number;
}

/**
 * Default configuration for type aggregation
 */
const DEFAULT_CONFIG: TypeAggregationConfig = {
	minConfidenceThreshold: 0.3,
	relationBoostFactor: 0.2,
};

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
		this.config = { ...DEFAULT_CONFIG, ...config };
		consola.debug(
			"Type aggregation service initialized with config:",
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
		consola.start(`Aggregating types for ${columnTypes.length} columns`);

		const annotations: ColumnTypeAnnotation[] = [];

		// Process each column
		for (let i = 0; i < columnTypes.length; i++) {
			const typeCandidates = columnTypes[i];
			const header =
				i < columnHeaders.length ? columnHeaders[i] : `Column${i + 1}`;

			// Skip empty columns
			if (typeCandidates.length === 0) {
				consola.warn(`No type candidates for column ${header}, skipping`);
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

			consola.success(
				`Column "${header}" annotated as "${bestType.type.label}" with confidence ${bestType.confidence.toFixed(2)}`,
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

		consola.debug(
			`Applying relationship boosts for column ${columnIndex} based on ${relevantRelations.length} relations`,
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

					consola.debug(
						`Boosted confidence for type "${candidate.type.label}" by ${boost.toFixed(2)} based on relation with column ${otherColumnIndex}`,
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

		// Define known compatible type pairs for common relations
		// TODO: This should be replaced with a more comprehensive mapping
		const compatibleTypePairs: Record<string, Array<[string, string]>> = {
			hasCapital: [
				[
					"http://dbpedia.org/ontology/Country",
					"http://dbpedia.org/ontology/City",
				],
				[
					"http://www.wikidata.org/entity/Q6256",
					"http://www.wikidata.org/entity/Q5119",
				],
			],
			hasCity: [
				[
					"http://dbpedia.org/ontology/Country",
					"http://dbpedia.org/ontology/City",
				],
				[
					"http://www.wikidata.org/entity/Q6256",
					"http://www.wikidata.org/entity/Q515",
				],
			],
			birthPlace: [
				[
					"http://dbpedia.org/ontology/Person",
					"http://dbpedia.org/ontology/Place",
				],
				[
					"http://www.wikidata.org/entity/Q215627",
					"http://www.wikidata.org/entity/Q2221906",
				],
			],
		};

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

	/**
	 * Filters annotations based on confidence threshold
	 * @param annotations The annotations to filter
	 * @returns Filtered annotations
	 */
	filterAnnotations(
		annotations: ColumnTypeAnnotation[],
	): ColumnTypeAnnotation[] {
		return annotations.filter(
			(annotation) =>
				annotation.confidence >= this.config.minConfidenceThreshold,
		);
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
