/**
 * Type Extraction Module
 *
 * This module is responsible for:
 * 1. Retrieving the types for each entity via the P31 ("instance of") property in Wikidata
 * 2. Extracting the equivalent types in DBpedia
 * 3. Compiling the types with confidence scores
 */

import { consola } from "consola";
import { DBpediaService } from "../services/DBpediaService";
import { WikidataService } from "../services/WikidataService";
import type { EntityCandidate, SemanticType, TypeCandidate } from "../types";
import { TypeMappingService } from "./typeMapping";

/**
 * Configuration for type extraction
 */
interface TypeExtractionConfig {
	minTypeConfidence: number;
	maxTypesPerColumn: number;
	useParentTypes: boolean;
}

/**
 * Default configuration for type extraction
 */
const DEFAULT_CONFIG: TypeExtractionConfig = {
	minTypeConfidence: 0.2,
	maxTypesPerColumn: 5,
	useParentTypes: true,
};

/**
 * Service for extracting and organizing types from entities
 */
export class TypeExtractionService {
	private dbpediaService: DBpediaService;
	private wikidataService: WikidataService;
	private typeMappingService: TypeMappingService;
	private config: TypeExtractionConfig;

	/**
	 * Creates a new type extraction service
	 */
	constructor() {
		this.config = { ...DEFAULT_CONFIG };
		this.dbpediaService = new DBpediaService();
		this.wikidataService = new WikidataService();
		this.typeMappingService = new TypeMappingService();

		consola.debug(
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
		consola.start(
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

		consola.success(
			`${filteredTypes.length} candidats de type extraits pour la colonne`,
		);
		return filteredTypes;
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
				consola.error(
					`Erreur lors de la récupération des types pour ${candidate.entity.uri} : ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Process each type
		for (const type of types) {
			// Skip too general types
			if (this.isTooGeneral(type)) continue;

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
			consola.error(
				`Erreur lors de la récupération des types parents pour ${type.uri} : ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Checks if a type is too general to be useful
	 * @param type The type to check
	 * @returns True if the type is too general
	 */
	private isTooGeneral(type: SemanticType): boolean {
		// List of URIs for types that are too general
		// TODO: This list should be configurable or fetched from a service
		const tooGeneralTypes = [
			"http://www.w3.org/2002/07/owl#Thing",
			"http://schema.org/Thing",
			"http://dbpedia.org/ontology/Thing",
			"http://www.wikidata.org/entity/Q35120", // Entity
			"http://www.wikidata.org/entity/Q488383", // Object
		];

		return tooGeneralTypes.includes(type.uri);
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
