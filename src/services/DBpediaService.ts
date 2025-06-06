/**
 * DBpedia Service
 *
 * This service is responsible for interacting with DBpedia:
 * 1. Searching for entities by label
 * 2. Retrieving entity information
 * 3. Querying for entity types
 */

import {
	type DBpediaServiceConfig,
	DEFAULT_DBPEDIA_SERVICE_CONFIG,
} from "../config";
import { logger } from "../logger";
import type { Entity, SemanticType } from "../types";
import { cacheService } from "./CacheService";
import { calculateStringSimilarity, queryWithRetries } from "./services.utils";

/**
 * Service for interacting with DBpedia
 */
export class DBpediaService {
	private config: DBpediaServiceConfig;

	/**
	 * Creates a new DBpedia service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<DBpediaServiceConfig> = {}) {
		this.config = { ...DEFAULT_DBPEDIA_SERVICE_CONFIG, ...config };
		logger.debug(
			"Service DBpedia initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Searches for entities in DBpedia by label
	 * @param query The search query
	 * @param limit Maximum number of results
	 * @returns Promise resolving to an array of entities
	 */
	async searchEntities(query: string, limit = 5): Promise<Entity[]> {
		try {
			logger.debug(`Recherche dans DBpedia pour : "${query}"`);

			// Generate a cache key for this search
			const cacheKey = cacheService.generateCacheKey("dbpedia-lookup", {
				query,
				limit,
			});

			// Check if the result is in the cache
			const cachedResult = cacheService.getFromDBpediaCache(cacheKey);
			if (cachedResult !== undefined) {
				logger.debug(
					`Utilisation du cache pour la recherche de "${query}" dans DBpedia`,
				);
				return cachedResult;
			}

			// If not in cache, make the API call
			const url = new URL(this.config.lookupEndpoint);
			url.searchParams.append("query", query);
			url.searchParams.append("maxResults", limit.toString());
			url.searchParams.append("format", "json");

			const response = await queryWithRetries(
				() =>
					fetch(url.toString(), {
						headers: {
							Accept: "application/json",
						},
					}),
				this.config,
			);

			if (!response.ok) {
				throw new Error(
					`DBpedia lookup failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Transform the response into our Entity format
			const entities: Entity[] = data.docs.map((doc: any, index: number) => {
				// Ensure doc.label exists and is a string
				const label =
					doc.label && typeof doc.label === "string"
						? doc.label
						: doc.resource?.[0] || "Unknown";

				// Calculate a confidence score based on position and label similarity
				const labelSimilarity = calculateStringSimilarity(
					query.toLowerCase(),
					label.toLowerCase(),
				);
				const positionScore = 1 - index / Math.max(data.docs.length, 1);
				const confidence = labelSimilarity * 0.7 + positionScore * 0.3;

				return {
					uri: doc.resource?.[0] || "",
					label,
					description: doc.comment || undefined,
					source: "DBpedia",
					confidence,
				};
			});

			// Cache the result
			cacheService.setInDBpediaCache(cacheKey, entities);

			logger.debug(
				`Trouvé ${entities.length} entités dans DBpedia pour "${query}"`,
			);
			return entities;
		} catch (error) {
			logger.error(
				`Erreur lors de la recherche dans DBpedia : ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Retrieves the types of an entity from DBpedia
	 * @param entityUri The URI of the entity
	 * @returns Promise resolving to an array of semantic types
	 */
	async getEntityTypes(entityUri: string): Promise<SemanticType[]> {
		try {
			logger.debug(`Récupération des types pour l'entité : ${entityUri}`);

			const query = `
        SELECT DISTINCT ?type ?label WHERE {
          <${entityUri}> a ?type .
          OPTIONAL { ?type rdfs:label ?label . FILTER(LANG(?label) = "en") }
          FILTER(STRSTARTS(STR(?type), "http://dbpedia.org/ontology/"))
        }
      `;

			// Generate a cache key for this query
			const cacheKey = cacheService.generateCacheKey(query, { entityUri });

			// Check if the result is in the cache
			const cachedResult = cacheService.getFromDBpediaCache(cacheKey);
			if (cachedResult !== undefined) {
				logger.debug(
					`Utilisation du cache pour les types de l'entité ${entityUri}`,
				);
				return cachedResult;
			}

			// If not in cache, make the API call
			const url = new URL(this.config.sparqlEndpoint);
			url.searchParams.append("query", query);
			url.searchParams.append("format", "json");

			const response = await queryWithRetries(
				() =>
					fetch(url.toString(), {
						headers: {
							Accept: "application/sparql-results+json",
						},
					}),
				this.config,
			);

			if (!response.ok) {
				throw new Error(
					`DBpedia SPARQL query failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Transform the response into our SemanticType format
			const types: SemanticType[] = data.results.bindings.map(
				(binding: any) => {
					return {
						uri: binding.type.value,
						label: binding.label
							? binding.label.value
							: this.extractLabelFromUri(binding.type.value),
						source: "DBpedia",
					};
				},
			);

			// Cache the result
			cacheService.setInDBpediaCache(cacheKey, types);

			logger.debug(`Trouvé ${types.length} types pour l'entité ${entityUri}`);
			return types;
		} catch (error) {
			logger.error(
				`Erreur lors de la récupération des types d'entité depuis DBpedia : ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Retrieves the parent types of a type from DBpedia
	 * @param typeUri The URI of the type
	 * @returns Promise resolving to an array of parent type URIs
	 */
	async getParentTypes(typeUri: string): Promise<string[]> {
		try {
			logger.debug(`Récupération des types parents pour : ${typeUri}`);

			const query = `
        SELECT DISTINCT ?parentType WHERE {
          <${typeUri}> rdfs:subClassOf ?parentType .
          FILTER(STRSTARTS(STR(?parentType), "http://dbpedia.org/ontology/"))
        }
      `;

			// Generate a cache key for this query
			const cacheKey = cacheService.generateCacheKey(query, { typeUri });

			// Check if the result is in the cache
			const cachedResult = cacheService.getFromDBpediaCache(cacheKey);
			if (cachedResult !== undefined) {
				logger.debug(
					`Utilisation du cache pour les types parents de ${typeUri}`,
				);
				return cachedResult;
			}

			// If not in cache, make the API call
			const url = new URL(this.config.sparqlEndpoint);
			url.searchParams.append("query", query);
			url.searchParams.append("format", "json");

			const response = await queryWithRetries(
				() =>
					fetch(url.toString(), {
						headers: {
							Accept: "application/sparql-results+json",
						},
					}),
				this.config,
			);

			if (!response.ok) {
				throw new Error(
					`DBpedia SPARQL query failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Extract parent type URIs
			const parentTypes = data.results.bindings.map(
				(binding: any) => binding.parentType.value,
			);

			// Cache the result
			cacheService.setInDBpediaCache(cacheKey, parentTypes);

			logger.debug(
				`Trouvé ${parentTypes.length} types parents pour ${typeUri}`,
			);
			return parentTypes;
		} catch (error) {
			logger.error(
				`Erreur lors de la récupération des types parents depuis DBpedia : ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Extracts a label from a URI
	 * @param uri The URI
	 * @returns The extracted label
	 */
	private extractLabelFromUri(uri: string): string {
		const parts = uri.split("/");
		const lastPart = parts[parts.length - 1];

		// Convert camelCase or PascalCase to words
		return lastPart
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
	}
}
