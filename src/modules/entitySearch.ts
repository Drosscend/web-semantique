/**
 * Entity Search Module
 *
 * This module is responsible for:
 * 1. Searching for entities corresponding to cell values in DBpedia and Wikidata
 * 2. Combining and ranking the results
 * 3. Finding candidate entities with confidence scores
 */

import { logger } from "../logger";
import { DBpediaService } from "../services/DBpediaService";
import { WikidataService } from "../services/WikidataService";
import type { CTAConfig, Cell, Entity, EntityCandidate } from "../types";

/**
 * Configuration for entity search
 */
interface EntitySearchConfig {
	maxEntitiesPerCell: number;
	minConfidence: number;
	useWikidata: boolean;
	useDBpedia: boolean;
	language: string;
}

/**
 * Default configuration for entity search
 */
const DEFAULT_CONFIG: EntitySearchConfig = {
	maxEntitiesPerCell: 3,
	minConfidence: 0.3,
	useWikidata: true,
	useDBpedia: true,
	language: "en",
};

/**
 * Service for searching entities across knowledge bases
 */
export class EntitySearchService {
	private dbpediaService: DBpediaService;
	private wikidataService: WikidataService;
	private config: EntitySearchConfig;

	/**
	 * Creates a new entity search service
	 * @param config Optional configuration
	 * @param dbpediaService Optional DBpedia service
	 * @param wikidataService Optional Wikidata service
	 */
	constructor(
		config: Partial<EntitySearchConfig> = {},
		dbpediaService?: DBpediaService,
		wikidataService?: WikidataService,
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.dbpediaService = dbpediaService || new DBpediaService();
		this.wikidataService = wikidataService || new WikidataService();

		logger.debug(
			"Service de recherche d'entités initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Searches for entities for a single cell
	 * @param cell The cell to search for
	 * @returns Promise resolving to an array of entity candidates
	 */
	async searchEntitiesForCell(cell: Cell): Promise<EntityCandidate[]> {
		const query = cell.value;

		if (!query.trim()) {
			logger.debug(
				`Cellule vide ignorée à [${cell.rowIndex}, ${cell.columnIndex}]`,
			);
			return [];
		}

		logger.debug(
			`Recherche d'entités pour la cellule : "${query}" [${cell.rowIndex}, ${cell.columnIndex}]`,
		);

		// Search in both knowledge bases in parallel
		const [dbpediaEntities, wikidataEntities] = await Promise.all([
			this.config.useDBpedia
				? this.dbpediaService.searchEntities(query)
				: Promise.resolve([]),
			this.config.useWikidata
				? this.wikidataService.searchEntities(query, this.config.language)
				: Promise.resolve([]),
		]);

		// Combine and rank the results
		const rankedEntities = this.rankEntities(
			[...dbpediaEntities, ...wikidataEntities],
			query,
		);

		// Filter by minimum confidence and maximum entities per cell
		const filteredEntities = rankedEntities
			.filter((entity) => entity.confidence >= this.config.minConfidence)
			.slice(0, this.config.maxEntitiesPerCell);

		// Create entity candidates
		const candidates: EntityCandidate[] = [];

		for (const entity of filteredEntities) {
			try {
				// Get entity types
				const types =
					entity.source === "DBpedia"
						? await this.dbpediaService.getEntityTypes(entity.uri)
						: await this.wikidataService.getEntityTypes(entity.uri);

				if (types.length > 0) {
					candidates.push({
						cell,
						entity,
						types,
						score: entity.confidence,
					});
				}
			} catch (error) {
				logger.error(
					`Erreur lors de la récupération des types pour l'entité ${entity.uri} : ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		logger.success(
			`${candidates.length} candidats d'entité trouvés pour la cellule "${query}"`,
		);
		return candidates;
	}

	/**
	 * Searches for entities for all cells in a column
	 * @param columnCells The cells in the column
	 * @returns Promise resolving to an array of entity candidates for each cell
	 */
	async searchEntitiesForColumn(
		columnCells: Cell[],
	): Promise<EntityCandidate[]> {
		logger.start(
			`Recherche d'entités pour la colonne avec ${columnCells.length} cellules`,
		);

		const candidates: EntityCandidate[] = [];

		// Process cells in batches to avoid overwhelming the APIs
		const batchSize = 5;
		for (let i = 0; i < columnCells.length; i += batchSize) {
			const batch = columnCells.slice(i, i + batchSize);

			logger.debug(
				`Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(columnCells.length / batchSize)}`,
			);

			const batchResults = await Promise.all(
				batch.map((cell) => this.searchEntitiesForCell(cell)),
			);

			for (const cellCandidates of batchResults) {
				candidates.push(...cellCandidates);
			}

			// Add a small delay between batches to be nice to the APIs
			if (i + batchSize < columnCells.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}

		logger.success(
			`${candidates.length} candidats d'entité trouvés pour la colonne`,
		);
		return candidates;
	}

	/**
	 * Searches for entities for all columns
	 * @param columnsCells The cells for each column
	 * @param config Optional CTA configuration
	 * @returns Promise resolving to an array of entity candidates for each column
	 */
	async searchEntitiesForAllColumns(
		columnsCells: Cell[][],
		config?: CTAConfig,
	): Promise<EntityCandidate[][]> {
		logger.start(`Recherche d'entités pour ${columnsCells.length} colonnes`);

		// Update configuration if provided
		if (config?.sparqlEndpoints) {
			if (config.sparqlEndpoints.dbpedia) {
				this.dbpediaService = new DBpediaService({
					sparqlEndpoint: config.sparqlEndpoints.dbpedia,
				});
			}

			if (config.sparqlEndpoints.wikidata) {
				this.wikidataService = new WikidataService({
					sparqlEndpoint: config.sparqlEndpoints.wikidata,
				});
			}
		}

		const columnCandidates: EntityCandidate[][] = [];

		for (let i = 0; i < columnsCells.length; i++) {
			logger.info(`Traitement de la colonne ${i + 1}/${columnsCells.length}`);

			const candidates = await this.searchEntitiesForColumn(columnsCells[i]);
			columnCandidates.push(candidates);

			// Add a small delay between columns to be nice to the APIs
			if (i < columnsCells.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		logger.success("Recherche d'entités terminée pour toutes les colonnes");
		return columnCandidates;
	}

	/**
	 * Ranks entities by relevance to the query
	 * @param entities The entities to rank
	 * @param query The original query
	 * @returns The ranked entities
	 */
	private rankEntities(entities: Entity[], query: string): Entity[] {
		// First, deduplicate entities by URI
		const uniqueEntities = new Map<string, Entity>();

		for (const entity of entities) {
			const existingEntity = uniqueEntities.get(entity.uri);

			if (!existingEntity || entity.confidence > existingEntity.confidence) {
				uniqueEntities.set(entity.uri, entity);
			}
		}

		// Convert back to array and sort by confidence
		const rankedEntities = Array.from(uniqueEntities.values()).sort(
			(a, b) => b.confidence - a.confidence,
		);

		// Apply additional ranking factors
		return rankedEntities
			.map((entity) => {
				let adjustedConfidence = entity.confidence;

				// Boost exact matches
				if (
					entity.label &&
					entity.label.toLowerCase() === query.toLowerCase()
				) {
					adjustedConfidence += 0.2;
				}

				// Boost entities with descriptions
				if (entity.description) {
					adjustedConfidence += 0.05;
				}

				// Cap confidence at 1.0
				adjustedConfidence = Math.min(adjustedConfidence, 1.0);

				return {
					...entity,
					confidence: adjustedConfidence,
				};
			})
			.sort((a, b) => b.confidence - a.confidence);
	}
}

/**
 * Creates a new entity search service with default configuration
 * @returns A new entity search service
 */
export function createEntitySearchService(): EntitySearchService {
	return new EntitySearchService();
}

/**
 * Searches for entities for all columns
 * @param columnsCells The cells for each column
 * @param config Optional CTA configuration
 * @returns Promise resolving to an array of entity candidates for each column
 */
export async function searchEntities(
	columnsCells: Cell[][],
	config?: CTAConfig,
): Promise<EntityCandidate[][]> {
	const service = createEntitySearchService();
	return service.searchEntitiesForAllColumns(columnsCells, config);
}
