/**
 * Cache Service
 *
 * This service provides caching functionality for SPARQL queries to Wikidata and DBpedia.
 * It uses quick-lru for efficient in-memory caching with LRU (Least Recently Used) eviction policy.
 *
 * Features:
 * 1. Separate caches for Wikidata and DBpedia
 * 2. Intelligent key generation based on query parameters
 * 3. Methods for cache invalidation and clearing
 * 4. Logging of cache hits and misses
 */

import QuickLRU from "quick-lru";
import { logger } from "../logger";
import { CacheServiceConfig, DEFAULT_CACHE_SERVICE_CONFIG } from "../config";

/**
 * Service for caching SPARQL query results
 */
export class CacheService {
	private wikidataCache: QuickLRU<string, any>;
	private dbpediaCache: QuickLRU<string, any>;
	private config: CacheServiceConfig;

	/**
	 * Creates a new cache service
	 * @param config Optional configuration
	 */
	constructor(config: Partial<CacheServiceConfig> = {}) {
		this.config = { ...DEFAULT_CACHE_SERVICE_CONFIG, ...config };

		// Initialize Wikidata cache
		this.wikidataCache = new QuickLRU({
			maxSize: this.config.wikidataMaxSize,
			maxAge: this.config.maxAge,
		});

		// Initialize DBpedia cache
		this.dbpediaCache = new QuickLRU({
			maxSize: this.config.dbpediaMaxSize,
			maxAge: this.config.maxAge,
		});

		logger.debug(
			"Service de cache initialisé avec la configuration :",
			this.config,
		);
	}

	/**
	 * Gets a value from the Wikidata cache
	 * @param key The cache key
	 * @returns The cached value or undefined if not found
	 */
	getFromWikidataCache(key: string): any {
		const value = this.wikidataCache.get(key);

		if (value !== undefined) {
			logger.debug(
				`Cache hit (Wikidata): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
			);
			return value;
		}

		logger.debug(
			`Cache miss (Wikidata): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
		);
		return undefined;
	}

	/**
	 * Sets a value in the Wikidata cache
	 * @param key The cache key
	 * @param value The value to cache
	 */
	setInWikidataCache(key: string, value: any): void {
		this.wikidataCache.set(key, value);
		logger.debug(
			`Cached (Wikidata): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
		);
	}

	/**
	 * Gets a value from the DBpedia cache
	 * @param key The cache key
	 * @returns The cached value or undefined if not found
	 */
	getFromDBpediaCache(key: string): any {
		const value = this.dbpediaCache.get(key);

		if (value !== undefined) {
			logger.debug(
				`Cache hit (DBpedia): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
			);
			return value;
		}

		logger.debug(
			`Cache miss (DBpedia): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
		);
		return undefined;
	}

	/**
	 * Sets a value in the DBpedia cache
	 * @param key The cache key
	 * @param value The value to cache
	 */
	setInDBpediaCache(key: string, value: any): void {
		this.dbpediaCache.set(key, value);
		logger.debug(
			`Cached (DBpedia): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
		);
	}

	/**
	 * Generates a cache key for a SPARQL query
	 * @param query The SPARQL query
	 * @param params Additional parameters that affect the query result
	 * @returns A unique cache key
	 */
	generateCacheKey(query: string, params: Record<string, any> = {}): string {
		// Normalize the query by removing extra whitespace
		const normalizedQuery = query.trim().replace(/\s+/g, " ");

		// Sort params to ensure consistent key generation
		const sortedParams = Object.keys(params)
			.sort()
			.map((key) => `${key}=${JSON.stringify(params[key])}`)
			.join("&");

		// Combine query and params into a single key
		return `${normalizedQuery}${sortedParams ? `?${sortedParams}` : ""}`;
	}

	/**
	 * Invalidates a specific entry in the Wikidata cache
	 * @param key The cache key to invalidate
	 * @returns True if the entry was found and removed, false otherwise
	 */
	invalidateWikidataEntry(key: string): boolean {
		const deleted = this.wikidataCache.delete(key);
		if (deleted) {
			logger.debug(
				`Invalidated cache entry (Wikidata): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
			);
		}
		return deleted;
	}

	/**
	 * Invalidates a specific entry in the DBpedia cache
	 * @param key The cache key to invalidate
	 * @returns True if the entry was found and removed, false otherwise
	 */
	invalidateDBpediaEntry(key: string): boolean {
		const deleted = this.dbpediaCache.delete(key);
		if (deleted) {
			logger.debug(
				`Invalidated cache entry (DBpedia): ${key.substring(0, 50)}${key.length > 50 ? "..." : ""}`,
			);
		}
		return deleted;
	}

	/**
	 * Clears the entire Wikidata cache
	 */
	clearWikidataCache(): void {
		this.wikidataCache.clear();
		logger.info("Wikidata cache cleared");
	}

	/**
	 * Clears the entire DBpedia cache
	 */
	clearDBpediaCache(): void {
		this.dbpediaCache.clear();
		logger.info("DBpedia cache cleared");
	}

	/**
	 * Clears both Wikidata and DBpedia caches
	 */
	clearAllCaches(): void {
		this.clearWikidataCache();
		this.clearDBpediaCache();
		logger.info("All caches cleared");
	}

	/**
	 * Gets the current size of the Wikidata cache
	 * @returns The number of entries in the Wikidata cache
	 */
	getWikidataCacheSize(): number {
		return this.wikidataCache.size;
	}

	/**
	 * Gets the current size of the DBpedia cache
	 * @returns The number of entries in the DBpedia cache
	 */
	getDBpediaCacheSize(): number {
		return this.dbpediaCache.size;
	}
}

// Create a singleton instance of the cache service
export const cacheService = new CacheService();
