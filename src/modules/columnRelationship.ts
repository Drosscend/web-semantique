/**
 * Column Relationship Analysis Module
 *
 * This module is responsible for:
 * 1. Calculating semantic distances between types identified in different columns
 * 2. Using relationships between columns to help disambiguate entity types
 * 3. Leveraging the context provided by other columns to improve type detection
 */

import { consola } from "consola";
import type { ColumnRelation, EntityCandidate, SemanticType } from "../types";

/**
 * Configuration for column relationship analysis
 */
interface ColumnRelationshipConfig {
	minRelationConfidence: number;
	maxRelationsPerColumn: number;
}

/**
 * Default configuration for column relationship analysis
 */
const DEFAULT_CONFIG: ColumnRelationshipConfig = {
	minRelationConfidence: 0.3,
	maxRelationsPerColumn: 3,
};

/**
 * Common semantic relationships between entity types
 */
interface TypeRelationship {
	sourceType: string;
	targetType: string;
	relationName: string;
	confidence: number;
}

/**
 * Known relationships between common entity types
 */
const KNOWN_TYPE_RELATIONSHIPS: TypeRelationship[] = [
	// TODO: Add more relationships as needed
	// Country - Capital
	{
		sourceType: "http://dbpedia.org/ontology/Country",
		targetType: "http://dbpedia.org/ontology/City",
		relationName: "hasCapital",
		confidence: 0.9,
	},
	{
		sourceType: "http://www.wikidata.org/entity/Q6256", // Country
		targetType: "http://www.wikidata.org/entity/Q5119", // Capital
		relationName: "hasCapital",
		confidence: 0.9,
	},

	// Country - City
	{
		sourceType: "http://dbpedia.org/ontology/Country",
		targetType: "http://dbpedia.org/ontology/City",
		relationName: "hasCity",
		confidence: 0.7,
	},
];

/**
 * Service for analyzing relationships between columns
 */
export class ColumnRelationshipService {
	private config: ColumnRelationshipConfig;

	/**
	 * Creates a new column relationship service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<ColumnRelationshipConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		consola.debug(
			"Column relationship service initialized with config:",
			this.config,
		);
	}

	/**
	 * Analyzes relationships between columns based on entity candidates
	 * @param columnCandidates The entity candidates for each column
	 * @returns An array of column relations
	 */
	analyzeColumnRelationships(
		columnCandidates: EntityCandidate[][],
	): ColumnRelation[] {
		consola.start(
			`Analyzing relationships between ${columnCandidates.length} columns`,
		);

		const relations: ColumnRelation[] = [];

		// For each pair of columns
		for (let i = 0; i < columnCandidates.length; i++) {
			for (let j = 0; j < columnCandidates.length; j++) {
				// Skip self-relations
				if (i === j) continue;

				const sourceColumnCandidates = columnCandidates[i];
				const targetColumnCandidates = columnCandidates[j];

				// Skip empty columns
				if (
					sourceColumnCandidates.length === 0 ||
					targetColumnCandidates.length === 0
				)
					continue;

				// Calculate the relationship confidence between these columns
				const relationInfo = this.calculateColumnRelationship(
					sourceColumnCandidates,
					targetColumnCandidates,
				);

				if (relationInfo.confidence >= this.config.minRelationConfidence) {
					relations.push({
						sourceColumnIndex: i,
						targetColumnIndex: j,
						relationType: relationInfo.relationType,
						confidence: relationInfo.confidence,
					});
				}
			}
		}

		// Sort relations by confidence (descending)
		relations.sort((a, b) => b.confidence - a.confidence);

		// Limit the number of relations per column
		const filteredRelations = this.filterTopRelations(relations);

		consola.success(
			`Found ${filteredRelations.length} significant column relationships`,
		);
		return filteredRelations;
	}

	/**
	 * Filters the top relations for each column
	 * @param relations All detected relations
	 * @returns Filtered relations.
	 */
	private filterTopRelations(relations: ColumnRelation[]): ColumnRelation[] {
		const relationsBySource = new Map<number, ColumnRelation[]>();

		// Group relations by source column
		for (const relation of relations) {
			if (!relationsBySource.has(relation.sourceColumnIndex)) {
				relationsBySource.set(relation.sourceColumnIndex, []);
			}
			const relations = relationsBySource.get(relation.sourceColumnIndex);
			if (relations) {
				relations.push(relation);
			}
		}

		// Take top N relations for each source column
		const filteredRelations: ColumnRelation[] = [];
		for (const [_, columnRelations] of relationsBySource) {
			filteredRelations.push(
				...columnRelations.slice(0, this.config.maxRelationsPerColumn),
			);
		}

		return filteredRelations;
	}

	/**
	 * Calculates the relationship between two columns
	 * @param sourceCandidates Candidates from the source column
	 * @param targetCandidates Candidates from the target column
	 * @returns The relationship type and confidence
	 */
	private calculateColumnRelationship(
		sourceCandidates: EntityCandidate[],
		targetCandidates: EntityCandidate[],
	): { relationType?: string; confidence: number } {
		// Extract the most common types for each column
		const sourceTypes = this.extractCommonTypes(sourceCandidates);
		const targetTypes = this.extractCommonTypes(targetCandidates);

		// Check for known relationships between these types
		let bestRelation: TypeRelationship | null = null;
		let bestConfidence = 0;

		for (const sourceType of sourceTypes) {
			for (const targetType of targetTypes) {
				// Check if there's a known relationship between these types
				for (const relation of KNOWN_TYPE_RELATIONSHIPS) {
					if (
						relation.sourceType === sourceType.uri &&
						relation.targetType === targetType.uri
					) {
						const confidence =
							relation.confidence *
							(sourceType.frequency / sourceCandidates.length) *
							(targetType.frequency / targetCandidates.length);

						if (confidence > bestConfidence) {
							bestRelation = relation;
							bestConfidence = confidence;
						}
					}
				}
			}
		}

		// Check for row-level relationships (same row index)
		const rowLevelConfidence = this.calculateRowLevelRelationship(
			sourceCandidates,
			targetCandidates,
		);

		// Combine type-based and row-level confidence
		const combinedConfidence = bestRelation
			? bestConfidence * 0.7 + rowLevelConfidence * 0.3
			: rowLevelConfidence * 0.5;

		return {
			relationType: bestRelation?.relationName,
			confidence: combinedConfidence,
		};
	}

	/**
	 * Calculates the row-level relationship confidence
	 * @param sourceCandidates Candidates from the source column
	 * @param targetCandidates Candidates from the target column
	 * @returns A confidence score between 0 and 1
	 */
	private calculateRowLevelRelationship(
		sourceCandidates: EntityCandidate[],
		targetCandidates: EntityCandidate[],
	): number {
		// Group candidates by row index
		const sourceByRow = new Map<number, EntityCandidate[]>();
		const targetByRow = new Map<number, EntityCandidate[]>();

		for (const candidate of sourceCandidates) {
			const rowIndex = candidate.cell.rowIndex;
			if (!sourceByRow.has(rowIndex)) {
				sourceByRow.set(rowIndex, []);
			}
			const candidates = sourceByRow.get(rowIndex);
			if (candidates) {
				candidates.push(candidate);
			}
		}

		for (const candidate of targetCandidates) {
			const rowIndex = candidate.cell.rowIndex;
			if (!targetByRow.has(rowIndex)) {
				targetByRow.set(rowIndex, []);
			}
			const candidates = targetByRow.get(rowIndex);
			if (candidates) {
				candidates.push(candidate);
			}
		}

		// Count rows where both columns have candidates
		let matchingRows = 0;
		let totalRows = 0;

		for (const rowIndex of new Set([
			...sourceByRow.keys(),
			...targetByRow.keys(),
		])) {
			totalRows++;
			if (sourceByRow.has(rowIndex) && targetByRow.has(rowIndex)) {
				matchingRows++;
			}
		}

		return totalRows > 0 ? matchingRows / totalRows : 0;
	}

	/**
	 * Extracts common types from entity candidates
	 * @param candidates The entity candidates
	 * @returns An array of common types with their frequency
	 */
	private extractCommonTypes(
		candidates: EntityCandidate[],
	): Array<SemanticType & { frequency: number }> {
		const typeFrequency = new Map<
			string,
			{ type: SemanticType; count: number }
		>();

		// Count occurrences of each type
		for (const candidate of candidates) {
			for (const type of candidate.types) {
				const key = type.uri;
				if (!typeFrequency.has(key)) {
					typeFrequency.set(key, { type, count: 0 });
				}
				const typeData = typeFrequency.get(key);
				if (typeData) {
					typeData.count += candidate.score;
				}
			}
		}

		// Convert to array and sort by frequency
		const sortedTypes = Array.from(typeFrequency.values())
			.map((item) => ({
				...item.type,
				frequency: item.count,
			}))
			.sort((a, b) => b.frequency - a.frequency);

		return sortedTypes;
	}
}

/**
 * Creates a new column relationship service with default configuration
 * @returns A new column relationship service
 */
export function createColumnRelationshipService(): ColumnRelationshipService {
	return new ColumnRelationshipService();
}

/**
 * Analyzes relationships between columns
 * @param columnCandidates The entity candidates for each column
 * @returns An array of column relations
 */
export function analyzeColumnRelationships(
	columnCandidates: EntityCandidate[][],
): ColumnRelation[] {
	const service = createColumnRelationshipService();
	return service.analyzeColumnRelationships(columnCandidates);
}
