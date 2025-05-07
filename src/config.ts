/**
 * Centralized Configuration Module
 *
 * This module centralizes all configuration objects used throughout the application.
 * It provides default configurations for all modules and the main application.
 * Each configuration option includes detailed explanations of its purpose and impact.
 */

import type { CTAConfig } from "./types";

/**
 * Configuration for the cache service
 */
export interface CacheServiceConfig {
	/**
	 * Maximum number of entries in the Wikidata cache
	 *
	 * Impact:
	 * - Higher values improve hit rates but increase memory usage
	 * - Lower values reduce memory usage but may decrease hit rates
	 * - Adjust based on the diversity of queries and available memory
	 */
	wikidataMaxSize: number;

	/**
	 * Maximum number of entries in the DBpedia cache
	 *
	 * Impact:
	 * - Higher values improve hit rates but increase memory usage
	 * - Lower values reduce memory usage but may decrease hit rates
	 * - Adjust based on the diversity of queries and available memory
	 */
	dbpediaMaxSize: number;

	/**
	 * Maximum age of cache entries in milliseconds (optional)
	 * If specified, entries older than this will be automatically removed
	 *
	 * Impact:
	 * - Setting this ensures data freshness but reduces cache effectiveness
	 * - Not setting this (undefined) means entries only expire via LRU eviction
	 * - Useful for data that changes periodically
	 */
	maxAge?: number;
}

/**
 * Default configuration for the cache service
 */
export const DEFAULT_CACHE_SERVICE_CONFIG: CacheServiceConfig = {
	wikidataMaxSize: 50000,
	dbpediaMaxSize: 50000,
	// By default, no maxAge is set, so entries only expire via LRU eviction
};

/**
 * Main application configuration
 *
 * These settings control the overall behavior of the CTA algorithm.
 * Adjusting these parameters can significantly impact performance, accuracy, and resource usage.
 */
export const DEFAULT_CTA_CONFIG: CTAConfig = {
	/**
	 * Number of rows to sample from the CSV for type detection
	 *
	 * Impact:
	 * - Higher values improve accuracy by analyzing more data but increase processing time
	 * - Lower values speed up processing but may reduce accuracy, especially for heterogeneous columns
	 * - Recommended to increase for large datasets with diverse values
	 * - For small datasets (<100 rows), consider using all rows (set to 0 for all rows)
	 */
	sampleSize: 50,

	/**
	 * Minimum confidence threshold for type assignment
	 *
	 * Impact:
	 * - Higher values (closer to 1.0) ensure more reliable type assignments but may leave some columns untyped
	 * - Lower values increase coverage but may introduce incorrect type assignments
	 * - Values below 0.2 may lead to many false positives
	 * - Values above 0.7 may be too restrictive for ambiguous columns
	 */
	confidenceThreshold: 0.3,

	/**
	 * Whether to analyze relationships between columns
	 *
	 * Impact:
	 * - When enabled, improves accuracy by considering semantic relationships between columns
	 * - Particularly helpful for related columns (e.g., country-capital, person-profession)
	 * - Disabling reduces processing time but may decrease accuracy for related columns
	 * - Recommended to keep enabled unless performance is critical
	 */
	useColumnRelations: true,

	/**
	 * Whether to analyze URIs for additional type information
	 *
	 * Impact:
	 * - When enabled, extracts additional information from entity URIs to improve type detection
	 * - Helps with disambiguation when entities have similar labels
	 * - Disabling reduces processing time but may decrease accuracy for ambiguous entities
	 * - Minimal performance impact, recommended to keep enabled
	 */
	useURIAnalysis: true,

	/**
	 * SPARQL endpoints for knowledge base access
	 *
	 * Impact:
	 * - Using alternative endpoints can improve performance or enable offline processing
	 * - Custom endpoints may have different rate limits or query capabilities
	 * - Changing these requires ensuring the endpoint supports the same query patterns
	 */
	sparqlEndpoints: {
		wikidata: "https://query.wikidata.org/sparql",
		dbpedia: "https://dbpedia.org/sparql",
	},

	/**
	 * Cache configuration for SPARQL queries
	 *
	 * Impact:
	 * - Caching significantly improves performance by reducing API calls
	 * - Larger cache sizes improve hit rates but increase memory usage
	 * - Setting maxAge ensures data freshness but reduces cache effectiveness
	 * - Adjust based on the diversity of queries and available memory
	 */
	cache: DEFAULT_CACHE_SERVICE_CONFIG,
};

/**
 * Configuration for column relationship analysis
 *
 * These settings control how relationships between columns are detected and used.
 * Column relationships help improve type detection by leveraging semantic connections.
 */
export interface ColumnRelationshipConfig {
	/**
	 * Minimum confidence threshold for accepting a relationship between columns
	 */
	minRelationConfidence: number;

	/**
	 * Maximum number of relationships to consider for each column
	 */
	maxRelationsPerColumn: number;
}

/**
 * Default configuration for column relationship analysis
 */
export const DEFAULT_COLUMN_RELATIONSHIP_CONFIG: ColumnRelationshipConfig = {
	/**
	 * Minimum confidence threshold for accepting a relationship between columns
	 *
	 * Impact:
	 * - Higher values ensure only strong relationships are considered, reducing false positives
	 * - Lower values capture more potential relationships but may introduce noise
	 * - Values below 0.2 may include many spurious relationships
	 * - Values above 0.5 may miss subtle but valid relationships
	 */
	minRelationConfidence: 0.3,

	/**
	 * Maximum number of relationships to consider for each column
	 *
	 * Impact:
	 * - Higher values consider more potential relationships but increase complexity
	 * - Lower values focus on the strongest relationships, improving performance
	 * - Most columns have 1-2 meaningful relationships; values above 5 rarely add value
	 * - Reducing this value can significantly improve performance for large datasets
	 */
	maxRelationsPerColumn: 3,
};

/**
 * Configuration for entity search
 *
 * These settings control how entities are searched and matched in knowledge bases.
 * Entity search is a critical step that affects the quality of type detection.
 */
export interface EntitySearchConfig {
	/**
	 * Maximum number of entity candidates to consider for each cell
	 */
	maxEntitiesPerCell: number;

	/**
	 * Minimum confidence threshold for accepting an entity match
	 */
	minConfidence: number;

	/**
	 * Whether to use Wikidata as a knowledge base
	 */
	useWikidata: boolean;

	/**
	 * Whether to use DBpedia as a knowledge base
	 */
	useDBpedia: boolean;

	/**
	 * Language code for entity search (e.g., "en", "fr")
	 */
	language: string;
}

/**
 * Default configuration for entity search
 */
export const DEFAULT_ENTITY_SEARCH_CONFIG: EntitySearchConfig = {
	/**
	 * Maximum number of entity candidates to consider for each cell
	 *
	 * Impact:
	 * - Higher values capture more potential matches but increase processing time
	 * - Lower values focus on the strongest matches, improving performance
	 * - Values above 5 rarely improve accuracy but significantly increase processing time
	 * - Values below 2 may miss valid matches for ambiguous terms
	 */
	maxEntitiesPerCell: 3,

	/**
	 * Minimum confidence threshold for accepting an entity match
	 *
	 * Impact:
	 * - Higher values ensure more reliable entity matches but may reduce coverage
	 * - Lower values increase coverage but may introduce incorrect matches
	 * - Values below 0.2 may include many false positives
	 * - Values above 0.6 may be too restrictive for fuzzy matches
	 */
	minConfidence: 0.3,

	/**
	 * Whether to use Wikidata as a knowledge base
	 *
	 * Impact:
	 * - Wikidata provides broad coverage across many domains
	 * - Disabling reduces API calls and improves performance
	 * - Recommended to keep enabled unless you're focusing only on domains better covered by DBpedia
	 */
	useWikidata: true,

	/**
	 * Whether to use DBpedia as a knowledge base
	 *
	 * Impact:
	 * - DBpedia provides rich type hierarchies and domain-specific information
	 * - Disabling reduces API calls and improves performance
	 * - Recommended to keep enabled for better type resolution
	 */
	useDBpedia: true,

	/**
	 * Language code for entity search
	 *
	 * Impact:
	 * - Affects entity matching in multilingual knowledge bases
	 * - Should match the primary language of your dataset
	 * - Using "en" provides the broadest coverage in most knowledge bases
	 */
	language: "en",
};

/**
 * Configuration for type aggregation
 *
 * These settings control how types are aggregated and selected for each column.
 * Type aggregation is the final step that determines the assigned type for each column.
 */
export interface TypeAggregationConfig {
	/**
	 * Minimum confidence threshold for accepting a type assignment
	 */
	minConfidenceThreshold: number;

	/**
	 * Factor by which to boost type scores based on column relationships
	 */
	relationBoostFactor: number;
}

/**
 * Default configuration for type aggregation
 */
export const DEFAULT_TYPE_AGGREGATION_CONFIG: TypeAggregationConfig = {
	/**
	 * Minimum confidence threshold for accepting a type assignment
	 *
	 * Impact:
	 * - Higher values ensure more reliable type assignments but may leave some columns untyped
	 * - Lower values increase coverage but may introduce incorrect type assignments
	 * - Values below 0.2 may lead to many false positives
	 * - Values above 0.6 may be too restrictive for ambiguous columns
	 */
	minConfidenceThreshold: 0.3,

	/**
	 * Factor by which to boost type scores based on column relationships
	 *
	 * Impact:
	 * - Higher values give more weight to relationships between columns
	 * - Lower values reduce the influence of relationships
	 * - Values above 0.5 may overemphasize relationships at the expense of direct evidence
	 * - Values below 0.1 may not sufficiently leverage relationship information
	 * - Particularly important for columns with ambiguous types that have clear relationships
	 */
	relationBoostFactor: 0.2,
};

/**
 * Configuration for type extraction
 *
 * These settings control how types are extracted from entity candidates.
 * Type extraction determines the potential semantic types for each column.
 */
export interface TypeExtractionConfig {
	/**
	 * Minimum confidence threshold for accepting a type
	 */
	minTypeConfidence: number;

	/**
	 * Maximum number of types to consider for each column
	 */
	maxTypesPerColumn: number;

	/**
	 * Whether to include parent types in the type hierarchy
	 */
	useParentTypes: boolean;
}

/**
 * Default configuration for type extraction
 */
export const DEFAULT_TYPE_EXTRACTION_CONFIG: TypeExtractionConfig = {
	/**
	 * Minimum confidence threshold for accepting a type
	 *
	 * Impact:
	 * - Higher values ensure more reliable types but may reduce the variety of candidates
	 * - Lower values increase the variety of type candidates but may introduce noise
	 * - Values below 0.1 may include many irrelevant types
	 * - Values above 0.4 may exclude valid but less common types
	 * - This threshold is applied before type aggregation, so it can be lower than the final threshold
	 */
	minTypeConfidence: 0.2,

	/**
	 * Maximum number of types to consider for each column
	 *
	 * Impact:
	 * - Higher values consider more potential types but increase processing time
	 * - Lower values focus on the strongest type candidates, improving performance
	 * - Values above 10 rarely improve accuracy but significantly increase processing time
	 * - Values below 3 may miss valid alternative types
	 */
	maxTypesPerColumn: 5,

	/**
	 * Whether to include parent types in the type hierarchy
	 *
	 * Impact:
	 * - When enabled, includes more general types in the hierarchy (e.g., "City" → "Settlement" → "Place")
	 * - Improves coverage by considering more general types when specific ones have low confidence
	 * - Disabling reduces processing time but may decrease accuracy for columns with diverse values
	 * - Particularly useful for heterogeneous columns that share a common parent type
	 */
	useParentTypes: true,
};

/**
 * Configuration for URI analysis
 *
 * These settings control how URIs are analyzed to improve entity matching.
 * URI analysis can extract additional context from entity URIs to enhance type detection.
 */
export interface URIAnalysisConfig {
	/**
	 * Amount by which to boost confidence when a match is found in a URI
	 */
	confidenceBoost: number;

	/**
	 * Minimum length of a string to consider for matching in URIs
	 */
	minMatchLength: number;
}

/**
 * Default configuration for URI analysis
 */
export const DEFAULT_URI_ANALYSIS_CONFIG: URIAnalysisConfig = {
	/**
	 * Amount by which to boost confidence when a match is found in a URI
	 *
	 * Impact:
	 * - Higher values give more weight to URI matches, potentially improving disambiguation
	 * - Lower values reduce the influence of URI patterns
	 * - Values above 0.3 may overemphasize URI patterns at the expense of other evidence
	 * - Values below 0.1 may not sufficiently leverage URI information
	 * - Particularly useful for disambiguating entities with similar labels but different URIs
	 */
	confidenceBoost: 0.2,

	/**
	 * Minimum length of a string to consider for matching in URIs
	 *
	 * Impact:
	 * - Higher values reduce false positives by requiring longer matches
	 * - Lower values increase sensitivity but may introduce spurious matches
	 * - Values below 3 may match many common short strings, creating noise
	 * - Values above 5 may miss valid matches for short entity names
	 * - Adjust based on the typical length of entity names in your dataset
	 */
	minMatchLength: 3,
};

/**
 * Configuration for service retry logic
 *
 * These settings control how API requests are retried when they fail.
 * Proper retry configuration can improve reliability when working with external services.
 */
export interface RetryConfig {
	/**
	 * Maximum number of retry attempts
	 */
	maxRetries: number;

	/**
	 * Delay between retry attempts (in milliseconds)
	 */
	retryDelay: number;

	/**
	 * Timeout for each request (in milliseconds)
	 */
	timeout: number;
}

/**
 * Default configuration for service retry logic
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	/**
	 * Maximum number of retry attempts
	 *
	 * Impact:
	 * - Higher values increase the chance of successful requests but may delay error reporting
	 * - Lower values fail faster but may miss successful requests after temporary issues
	 * - Values above 5 rarely improve success rates significantly
	 * - Values below 2 may not handle common transient network issues
	 */
	maxRetries: 3,

	/**
	 * Delay between retry attempts (in milliseconds)
	 *
	 * Impact:
	 * - Higher values give services more time to recover but increase total request time
	 * - Lower values retry quickly but may not allow enough recovery time
	 * - Values below 500ms may overwhelm services with rapid retries
	 * - Values above 2000ms significantly increase total request time
	 */
	retryDelay: 1000,

	/**
	 * Timeout for each request (in milliseconds)
	 *
	 * Impact:
	 * - Higher values allow more time for slow responses but increase waiting time for failures
	 * - Lower values fail quickly for slow services but may miss valid responses
	 * - Values below 5000ms may be too aggressive for complex queries
	 * - Values above 15000ms significantly delay error reporting
	 */
	timeout: 10000,
};

/**
 * Configuration for the Wikidata service
 *
 * These settings control how the application interacts with Wikidata.
 * Wikidata provides structured data that can be queried via SPARQL and API endpoints.
 */
export interface WikidataServiceConfig extends RetryConfig {
	/**
	 * Wikidata API endpoint
	 */
	apiEndpoint: string;

	/**
	 * Wikidata SPARQL endpoint
	 */
	sparqlEndpoint: string;
}

/**
 * Default configuration for the Wikidata service
 */
export const DEFAULT_WIKIDATA_SERVICE_CONFIG: WikidataServiceConfig = {
	/**
	 * Wikidata API endpoint
	 *
	 * Impact:
	 * - Changing this may be necessary if the official endpoint is unavailable
	 * - Alternative endpoints may have different rate limits or capabilities
	 * - Using a mirror can improve performance in some geographic regions
	 */
	apiEndpoint: "https://www.wikidata.org/w/api.php",

	/**
	 * Wikidata SPARQL endpoint
	 *
	 * Impact:
	 * - Changing this may be necessary if the official endpoint is unavailable
	 * - Alternative endpoints may have different query capabilities or performance
	 * - This should match the endpoint in sparqlEndpoints.wikidata for consistency
	 */
	sparqlEndpoint: "https://query.wikidata.org/sparql",

	...DEFAULT_RETRY_CONFIG,
};

/**
 * Configuration for the DBpedia service
 *
 * These settings control how the application interacts with DBpedia.
 * DBpedia provides structured data extracted from Wikipedia that can be queried.
 */
export interface DBpediaServiceConfig extends RetryConfig {
	/**
	 * DBpedia lookup endpoint for entity search
	 */
	lookupEndpoint: string;

	/**
	 * DBpedia SPARQL endpoint
	 */
	sparqlEndpoint: string;
}

/**
 * Default configuration for the DBpedia service
 */
export const DEFAULT_DBPEDIA_SERVICE_CONFIG: DBpediaServiceConfig = {
	/**
	 * DBpedia lookup endpoint for entity search
	 *
	 * Impact:
	 * - Changing this may be necessary if the official endpoint is unavailable
	 * - Alternative endpoints may have different rate limits or capabilities
	 * - Using a mirror can improve performance in some geographic regions
	 */
	lookupEndpoint: "https://lookup.dbpedia.org/api/search",

	/**
	 * DBpedia SPARQL endpoint
	 *
	 * Impact:
	 * - Changing this may be necessary if the official endpoint is unavailable
	 * - Alternative endpoints may have different query capabilities or performance
	 * - This should match the endpoint in sparqlEndpoints.dbpedia for consistency
	 */
	sparqlEndpoint: "https://dbpedia.org/sparql",

	...DEFAULT_RETRY_CONFIG,
};
