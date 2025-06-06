/**
 * Type Extraction Module
 *
 * This module is responsible for:
 * 1. Retrieving the types for each entity via the P31 ("instance of") property in Wikidata
 * 2. Extracting the equivalent types in DBpedia
 * 3. Compiling the types with confidence scores
 */

import {
	DEFAULT_TYPE_EXTRACTION_CONFIG,
	type TypeExtractionConfig,
} from "../config";
import { logger } from "../logger";
import { DBpediaService } from "../services/DBpediaService";
import { WikidataService } from "../services/WikidataService";
import type { EntityCandidate, SemanticType, TypeCandidate } from "../types";
import { TypeMappingService } from "./typeMapping";

/**
 * Service for extracting and organizing types from entities
 */
class TypeExtractionService {
	private dbpediaService: DBpediaService;
	private wikidataService: WikidataService;
	private readonly config: TypeExtractionConfig;

	/**
	 * Creates a new type extraction service
	 */
	constructor() {
		this.config = { ...DEFAULT_TYPE_EXTRACTION_CONFIG };
		this.dbpediaService = new DBpediaService();
		this.wikidataService = new WikidataService();

		logger.debug(
			"Service d'extraction de types initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Extracts types from entity candidates for a column
	 * @param candidates The entity candidates for the column
	 * @returns An array of type candidates for the column
	 */
	async extractColumnTypes(
		candidates: EntityCandidate[],
	): Promise<TypeCandidate[]> {
		logger.info(
			`Extraction des types à partir de ${candidates.length} candidats d'entité`,
		);

		// Group candidates by entity URI to avoid duplicate processing
		const candidatesByEntity = new Map<string, EntityCandidate[]>();

		for (const candidate of candidates) {
			const key = candidate.entity.uri;
			if (!candidatesByEntity.has(key)) {
				candidatesByEntity.set(key, []);
			}
			const candidates = candidatesByEntity.get(key);
			if (candidates) {
				candidates.push(candidate);
			}
		}

		// Process each unique entity
		const typeScores = new Map<
			string,
			{ type: SemanticType; score: number; entityMatches: number }
		>();

		for (const [entityUri, entityCandidates] of candidatesByEntity) {
			// Get the highest-scoring candidate for this entity
			const bestCandidate = entityCandidates.reduce(
				(best, current) => (current.score > best.score ? current : best),
				entityCandidates[0],
			);

			// Extract types for this entity
			await this.processEntityTypes(bestCandidate, typeScores);
		}

		// Convert to array and sort by score
		const typeCandidates = Array.from(typeScores.values())
			.map((item) => ({
				type: item.type,
				score: item.score,
				entityMatches: item.entityMatches,
				confidence: item.score / candidates.length,
			}))
			.sort((a, b) => b.score - a.score);

		// Filter by minimum confidence and maximum types
		const filteredTypes = typeCandidates
			.filter((type) => type.confidence >= this.config.minTypeConfidence)
			.slice(0, this.config.maxTypesPerColumn);

		logger.debug(
			`${filteredTypes.length} candidats de type extraits pour la colonne`,
		);

		// Log each extracted type with score and confidence
		for (const type of filteredTypes) {
			logger.debug(
				`Type extrait: ${type.type.uri} (label: ${type.type.label}), score: ${type.score.toFixed(2)}, confiance: ${type.confidence.toFixed(2)}, entityMatches: ${type.entityMatches}`,
			);
		}
		if (filteredTypes.length === 0) {
			logger.info("Aucun type extrait pour cette colonne (après filtrage)");
		}

		// Prioritize Wikidata types and convert DBpedia types
		const prioritizedTypes: TypeCandidate[] = [];
		const typeUriSet = new Set<string>();
		const typeMappingService = new TypeMappingService();

		// Process Wikidata types first
		const wikidataTypes = filteredTypes.filter(
			(candidate) => candidate.type.source === "Wikidata",
		);

		if (wikidataTypes.length > 0) {
			logger.debug(
				`Found ${wikidataTypes.length} direct Wikidata types for column`,
			);

			for (const candidate of wikidataTypes) {
				const confidenceBoost = Math.min(0.3, 0.2 * candidate.confidence + 0.1);
				const adjustedCandidate = {
					...candidate,
					confidence: Math.min(1.0, candidate.confidence + confidenceBoost),
				};

				prioritizedTypes.push(adjustedCandidate);
				typeUriSet.add(candidate.type.uri);
			}
		}

		// Then convert DBpedia types to Wikidata
		const dbpediaTypes = filteredTypes.filter(
			(candidate) => candidate.type.source === "DBpedia",
		);

		if (dbpediaTypes.length > 0) {
			logger.debug(
				`Attempting to convert ${dbpediaTypes.length} DBpedia types to Wikidata`,
			);

			for (const dbpediaCandidate of dbpediaTypes) {
				const wikidataEquivalents =
					typeMappingService.convertDbpediaTypeToWikidata(
						dbpediaCandidate.type,
					);

				if (wikidataEquivalents.length > 0) {
					for (const wikidataType of wikidataEquivalents) {
						if (!typeUriSet.has(wikidataType.uri)) {
							const convertedCandidate = {
								type: wikidataType,
								score: dbpediaCandidate.score,
								entityMatches: dbpediaCandidate.entityMatches,
								confidence: dbpediaCandidate.confidence,
							};

							prioritizedTypes.push(convertedCandidate);
							typeUriSet.add(wikidataType.uri);
						}
					}
				}
			}
		}

		// Fallback to original types if no Wikidata types found
		if (prioritizedTypes.length === 0) {
			logger.warn(
				"No Wikidata types (direct or converted) found for this column. Using original types.",
			);
			return filteredTypes;
		}

		// Sort by confidence and limit to max types
		const finalTypes = prioritizedTypes
			.sort((a, b) => b.confidence - a.confidence)
			.slice(0, this.config.maxTypesPerColumn);

		logger.info(
			`${finalTypes.length} final Wikidata types for column: ${finalTypes.map((t) => t.type.label).join(", ")}`,
		);

		return finalTypes;
	}

	/**
	 * Processes the types for an entity candidate
	 * @param candidate The entity candidate
	 * @param typeScores Map to store type scores
	 */
	private async processEntityTypes(
		candidate: EntityCandidate,
		typeScores: Map<
			string,
			{ type: SemanticType; score: number; entityMatches: number }
		>,
	): Promise<void> {
		// Get the entity's types
		const types = candidate.types;

		// If no types are available, try to fetch them
		if (types.length === 0) {
			try {
				if (candidate.entity.source === "DBpedia") {
					const fetchedTypes = await this.dbpediaService.getEntityTypes(
						candidate.entity.uri,
					);
					types.push(...fetchedTypes);
				} else if (candidate.entity.source === "Wikidata") {
					const fetchedTypes = await this.wikidataService.getEntityTypes(
						candidate.entity.uri,
					);
					types.push(...fetchedTypes);
				}
			} catch (error) {
				logger.error(
					`Erreur lors de la récupération des types pour ${candidate.entity.uri} : ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Process each type
		for (const type of types) {
			// Add or update the type score
			const key = type.uri;
			if (!typeScores.has(key)) {
				typeScores.set(key, { type, score: 0, entityMatches: 0 });
			}

			const typeScore = typeScores.get(key);
			if (typeScore) {
				typeScore.score += candidate.score;
				typeScore.entityMatches++;
			}

			// If enabled, process parent types
			if (this.config.useParentTypes) {
				await this.processParentTypes(type, candidate.score * 0.7, typeScores);
			}
		}
	}

	/**
	 * Processes the parent types of a type
	 * @param type The type
	 * @param score The score to assign to parent types
	 * @param typeScores Map to store type scores
	 */
	private async processParentTypes(
		type: SemanticType,
		score: number,
		typeScores: Map<
			string,
			{ type: SemanticType; score: number; entityMatches: number }
		>,
	): Promise<void> {
		// If parent types are already available, use them
		if (type.parentTypes && type.parentTypes.length > 0) {
			for (const parentTypeUri of type.parentTypes) {
				// Skip if already processed
				if (typeScores.has(parentTypeUri)) continue;

				// Create a parent type object
				const parentType: SemanticType = {
					uri: parentTypeUri,
					label: this.extractLabelFromUri(parentTypeUri),
					source: type.source,
				};

				// Add the parent type with a reduced score
				typeScores.set(parentTypeUri, {
					type: parentType,
					score: score,
					entityMatches: 1,
				});
			}
			return;
		}

		// Otherwise, fetch parent types
		try {
			let parentTypeUris: string[] = [];

			if (type.source === "DBpedia") {
				parentTypeUris = await this.dbpediaService.getParentTypes(type.uri);
			} else if (type.source === "Wikidata") {
				parentTypeUris = await this.wikidataService.getParentTypes(type.uri);
			}

			// Store the parent types for future use
			type.parentTypes = parentTypeUris;

			// Process each parent type
			for (const parentTypeUri of parentTypeUris) {
				// Skip if already processed
				if (typeScores.has(parentTypeUri)) continue;

				// Create a parent type object
				const parentType: SemanticType = {
					uri: parentTypeUri,
					label: this.extractLabelFromUri(parentTypeUri),
					source: type.source,
				};

				// Add the parent type with a reduced score
				typeScores.set(parentTypeUri, {
					type: parentType,
					score: score,
					entityMatches: 1,
				});
			}
		} catch (error) {
			logger.error(
				`Erreur lors de la récupération des types parents pour ${type.uri} : ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Extracts a label from a URI
	 * @param uri The URI
	 * @returns The extracted label
	 */
	private extractLabelFromUri(uri: string): string {
		const parts = uri.split(/[/#]/);
		const lastPart = parts[parts.length - 1];

		// Convert camelCase or PascalCase to words
		return lastPart
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
	}
}

/**
 * Creates a new type extraction service with default configuration
 * @returns A new type extraction service
 */
export function createTypeExtractionService(): TypeExtractionService {
	return new TypeExtractionService();
}

/**
 * Extracts types from entity candidates for all columns
 * @param columnCandidates The entity candidates for each column
 * @returns An array of type candidates for each column
 */
export async function extractTypesForAllColumns(
	columnCandidates: EntityCandidate[][],
): Promise<TypeCandidate[][]> {
	const service = createTypeExtractionService();

	const columnTypes: TypeCandidate[][] = [];
	for (const candidates of columnCandidates) {
		const types = await service.extractColumnTypes(candidates);
		columnTypes.push(types);
	}

	return columnTypes;
}
