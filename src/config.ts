/**
 * Centralized Configuration Module
 *
 * This module centralizes all configuration objects used throughout the application.
 * It provides default configurations for all modules and the main application.
 * Each configuration option includes detailed explanations of its purpose and impact.
 */

import type { CTAConfig } from "./types";

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
	sampleSize: 10,

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
