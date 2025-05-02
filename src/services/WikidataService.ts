/**
 * Wikidata Service
 *
 * This service is responsible for interacting with Wikidata:
 * 1. Searching for entities by label
 * 2. Retrieving entity information
 * 3. Querying for entity types (P31 - instance of)
 */

import { consola } from "consola";
import type { Entity, SemanticType } from "../types";

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
		consola.debug("Wikidata service initialized with config:", this.config);
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
			consola.debug(`Searching Wikidata for: "${query}" (${language})`);

			const url = new URL(this.config.apiEndpoint);
			url.searchParams.append("action", "wbsearchentities");
			url.searchParams.append("search", query);
			url.searchParams.append("language", language);
			url.searchParams.append("limit", limit.toString());
			url.searchParams.append("format", "json");
			url.searchParams.append("origin", "*");

			const response = await this.queryWithRetries(() => fetch(url.toString()));

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
				const labelSimilarity = this.calculateStringSimilarity(
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

			consola.debug(
				`Found ${entities.length} entities in Wikidata for "${query}"`,
			);
			return entities;
		} catch (error) {
			consola.error(
				`Error searching Wikidata: ${error instanceof Error ? error.message : String(error)}`,
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
			consola.debug(`Retrieving types for entity: ${entityUri}`);

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

			const response = await this.queryWithRetries(() =>
				fetch(url.toString(), {
					headers: {
						Accept: "application/sparql-results+json",
						"User-Agent": "CSV-Type-Detector/1.0",
					},
				}),
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

			consola.debug(`Found ${types.length} types for entity ${entityUri}`);
			return types;
		} catch (error) {
			consola.error(
				`Error retrieving entity types from Wikidata: ${error instanceof Error ? error.message : String(error)}`,
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
			consola.debug(`Retrieving parent types for: ${typeUri}`);

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

			const response = await this.queryWithRetries(() =>
				fetch(url.toString(), {
					headers: {
						Accept: "application/sparql-results+json",
						"User-Agent": "CSV-Type-Detector/1.0",
					},
				}),
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

			consola.debug(`Found ${parentTypes.length} parent types for ${typeUri}`);
			return parentTypes;
		} catch (error) {
			consola.error(
				`Error retrieving parent types from Wikidata: ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
		}
	}

	/**
	 * Retrieves the label of an entity from Wikidata
	 * @param entityId The ID of the entity (e.g., Q42)
	 * @param language The language code (default: 'en')
	 * @returns Promise resolving to the entity label
	 */
	async getEntityLabel(
		entityId: string,
		language = "en",
	): Promise<string | null> {
		try {
			consola.debug(`Retrieving label for entity: ${entityId}`);

			const url = new URL(this.config.apiEndpoint);
			url.searchParams.append("action", "wbgetentities");
			url.searchParams.append("ids", entityId);
			url.searchParams.append("props", "labels");
			url.searchParams.append("languages", language);
			url.searchParams.append("format", "json");
			url.searchParams.append("origin", "*");

			const response = await this.queryWithRetries(() => fetch(url.toString()));

			if (!response.ok) {
				throw new Error(
					`Wikidata API request failed with status: ${response.status}`,
				);
			}

			const data = await response.json();

			if (data.entities?.[entityId]?.labels?.[language]) {
				return data.entities[entityId].labels[language].value;
			}

			return null;
		} catch (error) {
			consola.error(
				`Error retrieving entity label from Wikidata: ${error instanceof Error ? error.message : String(error)}`,
			);
			return null;
		}
	}

	/**
	 * Executes a query with retries
	 * @param queryFn The query function to execute
	 * @returns Promise resolving to the query response
	 */
	private async queryWithRetries(
		queryFn: () => Promise<Response>,
	): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
			try {
				return await Promise.race([
					queryFn(),
					new Promise<Response>((_, reject) => {
						setTimeout(
							() => reject(new Error("Request timeout")),
							this.config.timeout,
						);
					}),
				]);
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				consola.warn(`Query attempt ${attempt} failed: ${lastError.message}`);

				if (attempt < this.config.maxRetries) {
					const delay = this.config.retryDelay * attempt;
					consola.debug(`Retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error("Query failed after retries");
	}

	/**
	 * Calculates the similarity between two strings
	 * @param a First string
	 * @param b Second string
	 * @returns A similarity score between 0 and 1
	 */
	private calculateStringSimilarity(a: string, b: string): number {
		if (a === b) return 1;
		if (a.length === 0 || b.length === 0) return 0;

		// Simple Jaccard similarity for demonstration
		const setA = new Set(a.split(""));
		const setB = new Set(b.split(""));

		const intersection = new Set([...setA].filter((x) => setB.has(x)));
		const union = new Set([...setA, ...setB]);

		return intersection.size / union.size;
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
