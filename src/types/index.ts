/**
 * Core types and interfaces for the CSV to RDF transformation project
 * These types provide a strong foundation for the Column Type Annotation (CTA) algorithm
 */

/**
 * Represents a CSV table with headers and data
 */
export interface CSVTable {
	headers: string[];
	data: string[][];
}

/**
 * Represents a cell in the CSV table
 */
export interface Cell {
	value: string;
	rowIndex: number;
	columnIndex: number;
	cleanedValue?: string;
}

/**
 * Represents an entity found in a knowledge base
 */
export interface Entity {
	uri: string;
	label: string;
	description?: string;
	source: "DBpedia" | "Wikidata";
	confidence: number;
}

/**
 * Represents a semantic type from a knowledge base
 */
export interface SemanticType {
	uri: string;
	label: string;
	source: "DBpedia" | "Wikidata";
	parentTypes?: string[]; // URIs of parent types
}

/**
 * Represents a candidate entity for a cell value
 */
export interface EntityCandidate {
	cell: Cell;
	entity: Entity;
	types: SemanticType[];
	score: number;
}

/**
 * Represents a candidate type for a column
 */
export interface TypeCandidate {
	type: SemanticType;
	score: number;
	entityMatches: number; // Number of entities in the column that have this type
	confidence: number; // Overall confidence in this type assignment
}

/**
 * Represents the final column type annotation result
 */
export interface ColumnTypeAnnotation {
	columnIndex: number;
	columnHeader: string;
	assignedType: SemanticType;
	confidence: number;
	alternativeTypes: TypeCandidate[];
}

/**
 * Configuration options for the CTA algorithm
 */
export interface CTAConfig {
	sampleSize?: number; // Number of rows to sample for type detection
	confidenceThreshold?: number; // Minimum confidence threshold for type assignment
	useColumnRelations?: boolean; // Whether to use relations between columns
	useURIAnalysis?: boolean; // Whether to analyze URIs for additional information
	sparqlEndpoints?: {
		wikidata?: string;
		dbpedia?: string;
	};
}

/**
 * Represents a mapping between DBpedia and Wikidata types
 */
export interface TypeMapping {
	dbpediaType: string; // URI of DBpedia type
	wikidataType: string; // URI of Wikidata type
	confidence: number; // Confidence in this mapping
}

/**
 * Represents a relation between two columns
 */
export interface ColumnRelation {
	sourceColumnIndex: number;
	targetColumnIndex: number;
	relationType?: string; // URI of the relation type if known
	confidence: number;
}
