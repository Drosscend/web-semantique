/**
 * DBpedia Service
 *
 * This service is responsible for interacting with DBpedia:
 * 1. Searching for entities by label
 * 2. Retrieving entity information
 * 3. Querying for entity types
 */

import { consola } from "consola";
import type { Entity, SemanticType } from "../types";

/**
 * Configuration for the DBpedia service
 */
interface DBpediaServiceConfig {
	lookupEndpoint: string;
	sparqlEndpoint: string;
	maxRetries: number;
	retryDelay: number;
	timeout: number;
}

/**
 * Default configuration for the DBpedia service
 */
const DEFAULT_CONFIG: DBpediaServiceConfig = {
	lookupEndpoint: "https://lookup.dbpedia.org/api/search",
	sparqlEndpoint: "https://dbpedia.org/sparql",
	maxRetries: 3,
	retryDelay: 1000,
	timeout: 10000,
};

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
		this.config = { ...DEFAULT_CONFIG, ...config };
		consola.debug("DBpedia service initialized with config:", this.config);
	}

	/**
	 * Searches for entities in DBpedia by label
	 * @param query The search query
	 * @param limit Maximum number of results
	 * @returns Promise resolving to an array of entities
	 */
	async searchEntities(query: string, limit = 5): Promise<Entity[]> {
		try {
			consola.debug(`Searching DBpedia for: "${query}"`);

			const url = new URL(this.config.lookupEndpoint);
			url.searchParams.append("query", query);
			url.searchParams.append("maxResults", limit.toString());
			url.searchParams.append("format", "json");

			const response = await this.queryWithRetries(() =>
				fetch(url.toString(), {
					headers: {
						Accept: "application/json",
					},
				}),
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
				const labelSimilarity = this.calculateStringSimilarity(
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

			consola.debug(
				`Found ${entities.length} entities in DBpedia for "${query}"`,
			);
			return entities;
		} catch (error) {
			consola.error(
				`Error searching DBpedia: ${error instanceof Error ? error.message : String(error)}`,
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
			consola.debug(`Retrieving types for entity: ${entityUri}`);

			const query = `
        SELECT DISTINCT ?type ?label WHERE {
          <${entityUri}> a ?type .
          OPTIONAL { ?type rdfs:label ?label . FILTER(LANG(?label) = "en") }
          FILTER(STRSTARTS(STR(?type), "http://dbpedia.org/ontology/"))
        }
      `;

			const url = new URL(this.config.sparqlEndpoint);
			url.searchParams.append("query", query);
			url.searchParams.append("format", "json");

			const response = await this.queryWithRetries(() =>
				fetch(url.toString(), {
					headers: {
						Accept: "application/sparql-results+json",
					},
				}),
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

			consola.debug(`Found ${types.length} types for entity ${entityUri}`);
			return types;
		} catch (error) {
			consola.error(
				`Error retrieving entity types from DBpedia: ${error instanceof Error ? error.message : String(error)}`,
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
			consola.debug(`Retrieving parent types for: ${typeUri}`);

			const query = `
        SELECT DISTINCT ?parentType WHERE {
          <${typeUri}> rdfs:subClassOf ?parentType .
          FILTER(STRSTARTS(STR(?parentType), "http://dbpedia.org/ontology/"))
        }
      `;

			const url = new URL(this.config.sparqlEndpoint);
			url.searchParams.append("query", query);
			url.searchParams.append("format", "json");

			const response = await this.queryWithRetries(() =>
				fetch(url.toString(), {
					headers: {
						Accept: "application/sparql-results+json",
					},
				}),
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

			consola.debug(`Found ${parentTypes.length} parent types for ${typeUri}`);
			return parentTypes;
		} catch (error) {
			consola.error(
				`Error retrieving parent types from DBpedia: ${error instanceof Error ? error.message : String(error)}`,
			);
			return [];
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

		// Convert camelCase or PascalCase to words
		return lastPart
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
	}
}
