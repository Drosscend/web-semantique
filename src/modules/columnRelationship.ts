/**
 * Column Relationship Analysis Module
 *
 * This module is responsible for:
 * 1. Calculating semantic distances between types identified in different columns
 * 2. Using relationships between columns to help disambiguate entity types
 * 3. Leveraging the context provided by other columns to improve type detection
 */

import {
	type ColumnRelationshipConfig,
	DEFAULT_COLUMN_RELATIONSHIP_CONFIG,
} from "../config";
import { logger } from "../logger";
import type { ColumnRelation, EntityCandidate, SemanticType } from "../types";
import { KNOWN_TYPE_RELATIONSHIPS, ALL_TYPE_RELATIONSHIPS, indexRelationships } from "../dataset/typeRelationshipDataset";
import type { TypeRelationship } from "../dataset/typeRelationshipDataset";

/**
 * Service for analyzing relationships between columns
 */
export class ColumnRelationshipService {
	private config: ColumnRelationshipConfig;
	private relationshipIndex = indexRelationships(ALL_TYPE_RELATIONSHIPS);

	/**
	 * Creates a new column relationship service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<ColumnRelationshipConfig> = {}) {
		this.config = { ...DEFAULT_COLUMN_RELATIONSHIP_CONFIG, ...config };
		logger.debug(
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
		logger.info(
			`Analyse des relations entre ${columnCandidates.length} colonnes`,
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
				const relationInfos = this.calculateColumnRelationship(
					sourceColumnCandidates,
					targetColumnCandidates,
				);
				for (const relationInfo of relationInfos) {
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
		}

		// Sort relations by confidence (descending)
		relations.sort((a, b) => b.confidence - a.confidence);

		// Limit the number of relations per column
		const filteredRelations = this.filterTopRelations(relations);

		logger.debug(
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
	): { relationType?: string; confidence: number }[] {
		const sourceTypes = this.extractCommonTypes(sourceCandidates);
		const targetTypes = this.extractCommonTypes(targetCandidates);
		const foundRelations: { relationType: string; confidence: number }[] = [];

		for (const sourceType of sourceTypes) {
			const targetMap = this.relationshipIndex.get(sourceType.uri);
			if (!targetMap) continue;
			for (const targetType of targetTypes) {
				const relations = targetMap.get(targetType.uri);
				if (!relations) continue;
				for (const relation of relations) {
					const confidence =
						relation.confidence *
						(sourceType.frequency / sourceCandidates.length) *
						(targetType.frequency / targetCandidates.length);
					foundRelations.push({
						relationType: relation.relationName,
						confidence,
					});
					logger.debug(
						`Relation found: ${sourceType.uri} -> ${targetType.uri} (${relation.relationName}), confidence: ${confidence.toFixed(2)}`
					);
				}
			}
		}

		if (foundRelations.length === 0) {
			logger.info(
				`No relation found between types for columns (source: ${sourceTypes.map(t => t.uri).join(", ")}, target: ${targetTypes.map(t => t.uri).join(", ")})`
			);
		}

		return foundRelations;
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
		return Array.from(typeFrequency.values())
			.map((item) => ({
				...item.type,
				frequency: item.count,
			}))
			.sort((a, b) => b.frequency - a.frequency);
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
