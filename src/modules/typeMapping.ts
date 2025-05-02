/**
 * Type Mapping Module
 *
 * This module is responsible for:
 * 1. Creating mappings between equivalent types from DBpedia and Wikidata
 * 2. Reinforcing the score of types that appear in both sources
 * 3. Providing a unified view of types across knowledge bases
 */

import { consola } from "consola";
import { DBpediaService } from "../services/DBpediaService";
import { WikidataService } from "../services/WikidataService";
import type { EntityCandidate, TypeMapping } from "../types";

/**
 * Known mappings between DBpedia and Wikidata types
 * This is a simplified mapping for common types
 */
const KNOWN_TYPE_MAPPINGS: TypeMapping[] = [
	// TODO: Add more mappings as needed
	// Places
	{
		dbpediaType: "http://dbpedia.org/ontology/City",
		wikidataType: "http://www.wikidata.org/entity/Q515",
		confidence: 1.0,
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Country",
		wikidataType: "http://www.wikidata.org/entity/Q6256",
		confidence: 1.0,
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Capital",
		wikidataType: "http://www.wikidata.org/entity/Q5119",
		confidence: 1.0,
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Place",
		wikidataType: "http://www.wikidata.org/entity/Q2221906",
		confidence: 0.9,
	},

	// People
	{
		dbpediaType: "http://dbpedia.org/ontology/Person",
		wikidataType: "http://www.wikidata.org/entity/Q215627",
		confidence: 1.0,
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Scientist",
		wikidataType: "http://www.wikidata.org/entity/Q901",
		confidence: 1.0,
	},

	// Organizations
	{
		dbpediaType: "http://dbpedia.org/ontology/Organisation",
		wikidataType: "http://www.wikidata.org/entity/Q43229",
		confidence: 1.0,
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Company",
		wikidataType: "http://www.wikidata.org/entity/Q783794",
		confidence: 1.0,
	},
];

/**
 * Service for mapping between DBpedia and Wikidata types
 */
export class TypeMappingService {
	private dbpediaService: DBpediaService;
	private wikidataService: WikidataService;
	private mappings: Map<string, TypeMapping[]> = new Map();

	/**
	 * Creates a new type mapping service
	 * @param dbpediaService Optional DBpedia service
	 * @param wikidataService Optional Wikidata service
	 */
	constructor(
		dbpediaService?: DBpediaService,
		wikidataService?: WikidataService,
	) {
		this.dbpediaService = dbpediaService || new DBpediaService();
		this.wikidataService = wikidataService || new WikidataService();

		// Initialize with known mappings
		this.initializeKnownMappings();

		consola.debug("Type mapping service initialized");
	}

	/**
	 * Initializes the service with known type mappings
	 */
	private initializeKnownMappings(): void {
		for (const mapping of KNOWN_TYPE_MAPPINGS) {
			this.addMapping(mapping);
		}

		consola.debug(
			`Initialized with ${KNOWN_TYPE_MAPPINGS.length} known type mappings`,
		);
	}

	/**
	 * Adds a mapping to the internal mapping store
	 * @param mapping The mapping to add
	 */
	private addMapping(mapping: TypeMapping): void {
		// Add mapping from DBpedia to Wikidata
		if (!this.mappings.has(mapping.dbpediaType)) {
			this.mappings.set(mapping.dbpediaType, []);
		}
		const dbpediaMappings = this.mappings.get(mapping.dbpediaType);
		if (dbpediaMappings) {
			dbpediaMappings.push(mapping);
		}

		// Add reverse mapping from Wikidata to DBpedia
		if (!this.mappings.has(mapping.wikidataType)) {
			this.mappings.set(mapping.wikidataType, []);
		}
		const wikidataMappings = this.mappings.get(mapping.wikidataType);
		if (wikidataMappings) {
			wikidataMappings.push({
				dbpediaType: mapping.dbpediaType,
				wikidataType: mapping.wikidataType,
				confidence: mapping.confidence,
			});
		}
	}

	/**
	 * Gets equivalent types for a given type
	 * @param typeUri The URI of the type
	 * @returns An array of equivalent type mappings
	 */
	getEquivalentTypes(typeUri: string): TypeMapping[] {
		return this.mappings.get(typeUri) || [];
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
	 * Enhances entity candidates with cross-knowledge base information
	 * @param candidates The entity candidates to enhance
	 * @returns The enhanced entity candidates
	 */
	enhanceCandidates(candidates: EntityCandidate[]): EntityCandidate[] {
		consola.start("Enhancing entity candidates with type mappings");

		const enhancedCandidates = candidates.map((candidate) => {
			// Clone the candidate to avoid modifying the original
			const enhancedCandidate = { ...candidate };

			// Adjust score based on type mappings
			let scoreAdjustment = 0;

			for (const type of candidate.types) {
				const equivalentTypes = this.getEquivalentTypes(type.uri);

				if (equivalentTypes.length > 0) {
					// If this type has equivalents in the other knowledge base,
					// increase the score based on the mapping confidence
					const maxMappingConfidence = Math.max(
						...equivalentTypes.map((mapping) => mapping.confidence),
					);

					scoreAdjustment += maxMappingConfidence * 0.1;
				}
			}

			// Apply score adjustment (capped at 0.3)
			enhancedCandidate.score = Math.min(
				1.0,
				candidate.score + Math.min(0.3, scoreAdjustment),
			);

			return enhancedCandidate;
		});

		consola.success(`Enhanced ${candidates.length} entity candidates`);
		return enhancedCandidates;
	}
}

/**
 * Creates a new type mapping service with default configuration
 * @returns A new type mapping service
 */
export function createTypeMappingService(): TypeMappingService {
	return new TypeMappingService();
}
