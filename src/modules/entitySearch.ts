/**
 * Entity Search Module
 *
 * This module is responsible for:
 * 1. Searching for entities corresponding to cell values in both DBpedia and Wikidata knowledge bases
 * 2. Finding equivalent entities across knowledge bases (e.g., matching a DBpedia entity to its Wikidata counterpart)
 * 3. Retrieving and combining semantic types from both knowledge bases for each entity
 * 4. Ranking and filtering entity candidates based on confidence scores and relevance
 * 5. Providing enriched entity candidates with types from multiple knowledge bases
 */

import {
	DEFAULT_ENTITY_SEARCH_CONFIG,
	type EntitySearchConfig,
} from "../config";
import { logger } from "../logger";
import { DBpediaService } from "../services/DBpediaService";
import { WikidataService } from "../services/WikidataService";
import type {
	Config,
	Cell,
	Entity,
	EntityCandidate,
	SemanticType,
} from "../types";

/**
 * Service for searching entities across knowledge bases
 */
class EntitySearchService {
	private dbpediaService: DBpediaService;
	private wikidataService: WikidataService;
	private config: EntitySearchConfig;

	// Local cache to avoid redundant entity searches for the same cell value
	private entitySearchCache: Map<string, EntityCandidate[]> = new Map();

	// Configurable batch and delay settings
	private batchSize: number;
	private batchDelay: number;
	private columnDelay: number;
	private minLength: number;

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
		this.config = { ...DEFAULT_ENTITY_SEARCH_CONFIG, ...config };
		this.dbpediaService = dbpediaService || new DBpediaService();
		this.wikidataService = wikidataService || new WikidataService();

		// Set batch and delay settings (all required in config)
		this.batchSize = this.config.batchSize;
		this.batchDelay = this.config.batchDelay;
		this.columnDelay = this.config.columnDelay;
		this.minLength = this.config.minLength;

		logger.debug(
			"Service de recherche d'entités initialisé avec la configuration :",
			this.config,
		);
	}

	// Helper: retry a promise-returning function with exponential backoff
	private async retryWithBackoff<T>(
		fn: () => Promise<T>,
		maxRetries = 3,
		baseDelay = 300,
	): Promise<T> {
		let attempt = 0;
		while (true) {
			try {
				return await fn();
			} catch (err) {
				if (attempt >= maxRetries) throw err;
				const delay = baseDelay * 2 ** attempt;
				logger.warn(
					`Erreur réseau, tentative ${attempt + 1}/${maxRetries}, nouvel essai dans ${delay}ms`,
				);
				await new Promise((res) => setTimeout(res, delay));
				attempt++;
			}
		}
	}

	/**
	 * Searches for entities for a single cell
	 * @param cell The cell to search for
	 * @returns Promise resolving to an array of entity candidates
	 */
	async searchEntitiesForCell(cell: Cell): Promise<EntityCandidate[]> {
		const query = cell.value;

		// Pre-filter: skip empty, '0', or '-'
		if (!query.trim() || query.trim() === "0" || query.trim() === "-") {
			logger.debug(
				`Cellule ignorée (vide, '0' ou '-') à [${cell.rowIndex}, ${cell.columnIndex}]`,
			);
			return [];
		}
		if (query.length < this.minLength) {
			logger.debug(
				`Cellule ignorée (trop courte) à [${cell.rowIndex}, ${cell.columnIndex}] : "${query}"`,
			);
			return [];
		}

		// Check the local cache before searching
		if (this.entitySearchCache.has(query)) {
			logger.debug(
				`Résultat de recherche d'entité réutilisé depuis le cache local pour "${query}"`,
			);
			const cached = this.entitySearchCache.get(query);
			return cached ? cached.map((c) => ({ ...c, cell })) : [];
		}

		logger.debug(
			`Recherche d'entités pour la cellule : "${query}" [${cell.rowIndex}, ${cell.columnIndex}]`,
		);

		// Search in both knowledge bases in parallel, with retry/backoff
		const [dbpediaEntities, wikidataEntities] = await Promise.all([
			this.config.useDBpedia
				? this.retryWithBackoff(() => this.dbpediaService.searchEntities(query))
				: Promise.resolve([]),
			this.config.useWikidata
				? this.retryWithBackoff(() =>
						this.wikidataService.searchEntities(query, this.config.language),
					)
				: Promise.resolve([]),
		]);

		const rankedEntities = this.rankEntities(
			[...dbpediaEntities, ...wikidataEntities],
			query,
		);

		const filteredEntities = rankedEntities
			.filter((entity) => entity.confidence >= this.config.minConfidence)
			.slice(0, this.config.maxEntitiesPerCell);

		const candidates: EntityCandidate[] = [];

		for (const entity of filteredEntities) {
			try {
				let dbpediaTypes: SemanticType[] = [];
				let wikidataTypes: SemanticType[] = [];

				// Get types from the entity's original source (with retry)
				if (entity.source === "DBpedia") {
					dbpediaTypes = await this.retryWithBackoff(() =>
						this.dbpediaService.getEntityTypes(entity.uri),
					);
				} else {
					wikidataTypes = await this.retryWithBackoff(() =>
						this.wikidataService.getEntityTypes(entity.uri),
					);
				}

				// Only perform cross-source lookup if no types found or confidence is low
				const crossSourceThreshold = this.config.crossSourceConfidenceThreshold;
				const needCrossSource =
					dbpediaTypes.length + wikidataTypes.length === 0 ||
					entity.confidence < crossSourceThreshold;
				if (needCrossSource) {
					try {
						if (entity.source === "DBpedia") {
							const resourceName = entity.uri.split("/").pop();
							if (resourceName) {
								const wikidataEntities = await this.retryWithBackoff(() =>
									this.wikidataService.searchEntities(
										resourceName.replace(/_/g, " "),
										this.config.language,
										1,
									),
								);
								if (wikidataEntities.length > 0) {
									wikidataTypes = await this.retryWithBackoff(() =>
										this.wikidataService.getEntityTypes(
											wikidataEntities[0].uri,
										),
									);
								}
							}
						} else {
							const entityId = entity.uri.split("/").pop();
							if (entityId) {
								const dbpediaEntities = await this.retryWithBackoff(() =>
									this.dbpediaService.searchEntities(entity.label, 1),
								);
								if (dbpediaEntities.length > 0) {
									dbpediaTypes = await this.retryWithBackoff(() =>
										this.dbpediaService.getEntityTypes(dbpediaEntities[0].uri),
									);
								}
							}
						}
					} catch (crossSourceError) {
						logger.debug(
							`Impossible de récupérer les types de l'autre source pour l'entité ${entity.uri}: ${crossSourceError instanceof Error ? crossSourceError.message : String(crossSourceError)}`,
						);
					}
				}

				const combinedTypes = [...dbpediaTypes, ...wikidataTypes];

				if (combinedTypes.length > 0) {
					candidates.push({
						cell,
						entity,
						types: combinedTypes,
						score: entity.confidence,
					});
				}
			} catch (error) {
				logger.error(
					`Erreur lors de la récupération des types pour l'entité ${entity.uri} : ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		this.entitySearchCache.set(query, candidates);

		logger.debug(
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
		logger.info(
			`Recherche d'entités pour la colonne ${columnCells[0].columnIndex} avec ${columnCells.length} cellules`,
		);

		const candidates: EntityCandidate[] = [];

		// Process cells in batches to avoid overwhelming the APIs
		for (let i = 0; i < columnCells.length; i += this.batchSize) {
			const batch = columnCells.slice(i, i + this.batchSize);

			logger.debug(
				`Traitement du lot ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(columnCells.length / this.batchSize)}`,
			);

			const batchResults = await Promise.all(
				batch.map((cell) => this.searchEntitiesForCell(cell)),
			);

			for (const cellCandidates of batchResults) {
				candidates.push(...cellCandidates);
			}

			// Add a configurable delay between batches
			if (i + this.batchSize < columnCells.length) {
				await new Promise((resolve) => setTimeout(resolve, this.batchDelay));
			}
		}

		logger.debug(
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
		config?: Config,
	): Promise<EntityCandidate[][]> {
		logger.info(`Recherche d'entités pour ${columnsCells.length} colonnes`);

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
			logger.debug(`Traitement de la colonne ${i + 1}/${columnsCells.length}`);

			const candidates = await this.searchEntitiesForColumn(columnsCells[i]);
			columnCandidates.push(candidates);

			// Add a configurable delay between columns
			if (i < columnsCells.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, this.columnDelay));
			}
		}

		logger.info("Recherche d'entités terminée pour toutes les colonnes");
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
	config?: Config,
): Promise<EntityCandidate[][]> {
	const service = createEntitySearchService();
	return service.searchEntitiesForAllColumns(columnsCells, config);
}
