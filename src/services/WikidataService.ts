/**
 * Wikidata Service
 *
 * This service is responsible for interacting with Wikidata:
 * 1. Searching for entities by label
 * 2. Retrieving entity information
 * 3. Querying for entity types (P31 - instance of)
 */

import { logger } from "../logger";
import type { Entity, SemanticType } from "../types";
import { calculateStringSimilarity, queryWithRetries } from "./services.utils";

/**
 * Configuration for the Wikidata service
 */
interface WikidataServiceConfig {
	apiEndpoint: string;
	sparqlEndpoint: string;
	maxRetries: number;
	retryDelay: number;
	timeout: number;
}

/**
 * Default configuration for the Wikidata service
 */
const DEFAULT_CONFIG: WikidataServiceConfig = {
	apiEndpoint: "https://www.wikidata.org/w/api.php",
	sparqlEndpoint: "https://query.wikidata.org/sparql",
	maxRetries: 3,
	retryDelay: 1000,
	timeout: 10000,
};

/**
 * Service for interacting with Wikidata
 */
export class WikidataService {
	private config: WikidataServiceConfig;

	/**
	 * Creates a new Wikidata service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<WikidataServiceConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		logger.debug(
			"Service Wikidata initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Searches for entities in Wikidata by label
	 * @param query The search query
	 * @param language The language code (default: 'en')
	 * @param limit Maximum number of results
	 * @returns Promise resolving to an array of entities
	 */
	async searchEntities(
		query: string,
		language = "en",
		limit = 5,
	): Promise<Entity[]> {
		try {
			logger.debug(`Recherche dans Wikidata pour : "${query}" (${language})`);

			const url = new URL(this.config.apiEndpoint);
			url.searchParams.append("action", "wbsearchentities");
			url.searchParams.append("search", query);
			url.searchParams.append("language", language);
			url.searchParams.append("limit", limit.toString());
			url.searchParams.append("format", "json");
			url.searchParams.append("origin", "*");

			const response = await queryWithRetries(
				() => fetch(url.toString()),
				this.config,
			);

			if (!response.ok) {
				throw new Error(
					`Wikidata search failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Transform the response into our Entity format
			const entities: Entity[] = data.search.map((item: any, index: number) => {
				// Ensure item.label exists and is a string
				const label =
					item.label && typeof item.label === "string"
						? item.label
						: item.id || "Unknown";

				// Calculate a confidence score based on position and label similarity
				const labelSimilarity = calculateStringSimilarity(
					query.toLowerCase(),
					label.toLowerCase(),
				);
				const positionScore = 1 - index / Math.max(data.search.length, 1);
				const confidence = labelSimilarity * 0.7 + positionScore * 0.3;

				return {
					uri: `http://www.wikidata.org/entity/${item.id || ""}`,
					label,
					description: item.description || undefined,
					source: "Wikidata",
					confidence,
				};
			});

			logger.debug(
				`Trouvé ${entities.length} entités dans Wikidata pour "${query}"`,
			);
			return entities;
		} catch (error) {
			logger.error(
				`Erreur lors de la recherche dans Wikidata : ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Retrieves the types of an entity from Wikidata (P31 - instance of)
	 * @param entityUri The URI of the entity
	 * @returns Promise resolving to an array of semantic types
	 */
	async getEntityTypes(entityUri: string): Promise<SemanticType[]> {
		try {
			logger.debug(`Récupération des types pour l'entité : ${entityUri}`);

			// Extract the entity ID from the URI
			const entityId = entityUri.split("/").pop() || "";

			if (!entityId) {
				throw new Error(`Invalid entity URI: ${entityUri}`);
			}

			const query = `
        SELECT ?type ?typeLabel WHERE {
          wd:${entityId} wdt:P31 ?type .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
      `;

			const url = new URL(this.config.sparqlEndpoint);
			url.searchParams.append("query", query);

			const response = await queryWithRetries(
				() =>
					fetch(url.toString(), {
						headers: {
							Accept: "application/sparql-results+json",
							"User-Agent": "CSV-Type-Detector/1.0",
						},
					}),
				this.config,
			);

			if (!response.ok) {
				throw new Error(
					`Wikidata SPARQL query failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Transform the response into our SemanticType format
			const types: SemanticType[] = data.results.bindings.map(
				(binding: any) => {
					return {
						uri: binding.type.value,
						label:
							binding.typeLabel?.value ||
							this.extractLabelFromUri(binding.type.value),
						source: "Wikidata",
					};
				},
			);

			logger.debug(`Trouvé ${types.length} types pour l'entité ${entityUri}`);
			return types;
		} catch (error) {
			logger.error(
				`Erreur lors de la récupération des types d'entité depuis Wikidata : ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Retrieves the parent types of a type from Wikidata (P279 - subclass of)
	 * @param typeUri The URI of the type
	 * @returns Promise resolving to an array of parent type URIs
	 */
	async getParentTypes(typeUri: string): Promise<string[]> {
		try {
			logger.debug(`Récupération des types parents pour : ${typeUri}`);

			// Extract the entity ID from the URI
			const typeId = typeUri.split("/").pop() || "";

			if (!typeId) {
				throw new Error(`Invalid type URI: ${typeUri}`);
			}

			const query = `
        SELECT ?parentType WHERE {
          wd:${typeId} wdt:P279 ?parentType .
        }
      `;

			const url = new URL(this.config.sparqlEndpoint);
			url.searchParams.append("query", query);

			const response = await queryWithRetries(
				() =>
					fetch(url.toString(), {
						headers: {
							Accept: "application/sparql-results+json",
							"User-Agent": "CSV-Type-Detector/1.0",
						},
					}),
				this.config,
			);

			if (!response.ok) {
				throw new Error(
					`Wikidata SPARQL query failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			// Extract parent type URIs
			const parentTypes = data.results.bindings.map(
				(binding: any) => binding.parentType.value,
			);

			logger.debug(
				`Trouvé ${parentTypes.length} types parents pour ${typeUri}`,
			);
			return parentTypes;
		} catch (error) {
			logger.error(
				`Erreur lors de la récupération des types parents depuis Wikidata : ${error instanceof Error ? error.message : String(error)}`,
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

		// For Wikidata URIs, try to extract the label from the entity ID
		if (lastPart.startsWith("Q")) {
			return `Wikidata Entity ${lastPart}`;
		}

		return lastPart;
	}
}
