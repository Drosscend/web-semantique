/**
 * Type Mapping Module
 *
 * This module is responsible for:
 * 1. Creating mappings between equivalent types from DBpedia and Wikidata
 * 2. Reinforcing the score of types that appear in both sources
 * 3. Providing a unified view of types across knowledge bases
 */

import { consola } from "consola";
import type { EntityCandidate, TypeMapping } from "../types";

/**
 * Known mappings between DBpedia and Wikidata types
 * This is a simplified mapping for common types
 */
const KNOWN_TYPE_MAPPINGS: TypeMapping[] = [
	// Places and Geographical Features
	{
		dbpediaType: "http://dbpedia.org/ontology/Place",
		wikidataType: "http://www.wikidata.org/entity/Q2221906",
		confidence: 0.9,
		description: "General concept of a place or location",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/City",
		wikidataType: "http://www.wikidata.org/entity/Q515",
		confidence: 1.0,
		description:
			"Large human settlement, typically with administrative or legal status",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Country",
		wikidataType: "http://www.wikidata.org/entity/Q6256",
		confidence: 1.0,
		description:
			"Distinct political entity with sovereignty over a geographical territory",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Capital",
		wikidataType: "http://www.wikidata.org/entity/Q5119",
		confidence: 1.0,
		description: "City or town that functions as the seat of government",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Settlement",
		wikidataType: "http://www.wikidata.org/entity/Q486972",
		confidence: 0.9,
		description: "Place where people permanently live",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Mountain",
		wikidataType: "http://www.wikidata.org/entity/Q8502",
		confidence: 1.0,
		description: "Large natural elevation of the Earth's surface",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Lake",
		wikidataType: "http://www.wikidata.org/entity/Q23397",
		confidence: 1.0,
		description: "Body of relatively still water localized in a basin",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/River",
		wikidataType: "http://www.wikidata.org/entity/Q4022",
		confidence: 1.0,
		description: "Natural flowing watercourse",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Road",
		wikidataType: "http://www.wikidata.org/entity/Q34442",
		confidence: 0.95,
		description: "Linear path with a smooth surface for travel",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Airport",
		wikidataType: "http://www.wikidata.org/entity/Q1248784",
		confidence: 1.0,
		description:
			"Location where aircraft take off and land with extended facilities",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Region",
		wikidataType: "http://www.wikidata.org/entity/Q82794",
		confidence: 0.9,
		description:
			"Area having definable characteristics but not always fixed boundaries",
	},

	// People and Groups
	{
		dbpediaType: "http://dbpedia.org/ontology/Person",
		wikidataType: "http://www.wikidata.org/entity/Q215627",
		confidence: 0.95,
		description:
			"Being with personhood (generic concept, prefer Human for individuals)",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Human",
		wikidataType: "http://www.wikidata.org/entity/Q5",
		confidence: 1.0,
		description:
			"Member of species Homo sapiens, commonly used for individuals",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Scientist",
		wikidataType: "http://www.wikidata.org/entity/Q901",
		confidence: 1.0,
		description: "Person who conducts scientific research or investigation",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Artist",
		wikidataType: "http://www.wikidata.org/entity/Q483501",
		confidence: 0.95,
		description: "Person who creates art",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Politician",
		wikidataType: "http://www.wikidata.org/entity/Q82955",
		confidence: 0.95,
		description: "Person involved in politics and government",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Athlete",
		wikidataType: "http://www.wikidata.org/entity/Q2066131",
		confidence: 0.95,
		description: "Person trained or skilled in exercises, sports, or games",
	},

	// Organizations
	{
		dbpediaType: "http://dbpedia.org/ontology/Organisation",
		wikidataType: "http://www.wikidata.org/entity/Q43229",
		confidence: 1.0,
		description: "Social entity established to meet needs or pursue goals",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Company",
		wikidataType: "http://www.wikidata.org/entity/Q783794",
		confidence: 1.0,
		description:
			"Business organization that makes, buys, or sells goods or provides services",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/GovernmentAgency",
		wikidataType: "http://www.wikidata.org/entity/Q327333",
		confidence: 0.95,
		description: "Organization in the executive branch of government",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/EducationalInstitution",
		wikidataType: "http://www.wikidata.org/entity/Q2385804",
		confidence: 0.95,
		description: "Institution that provides education",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/School",
		wikidataType: "http://www.wikidata.org/entity/Q3914",
		confidence: 1.0,
		description: "Institution for the education of students by teachers",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/University",
		wikidataType: "http://www.wikidata.org/entity/Q3918",
		confidence: 1.0,
		description: "Academic institution for further education",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Non-ProfitOrganisation",
		wikidataType: "http://www.wikidata.org/entity/Q163740",
		confidence: 0.9,
		description: "Organization that uses surplus revenues to achieve its goals",
	},

	// Events
	{
		dbpediaType: "http://dbpedia.org/ontology/Event",
		wikidataType: "http://www.wikidata.org/entity/Q1656682",
		confidence: 0.95,
		description: "Something that happens at a specific time and place",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/SportsEvent",
		wikidataType: "http://www.wikidata.org/entity/Q1656682",
		confidence: 0.9,
		description: "Competition or gathering for sports activities",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/MusicFestival",
		wikidataType: "http://www.wikidata.org/entity/Q181683",
		confidence: 0.95,
		description: "Festival focused on music performances",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Election",
		wikidataType: "http://www.wikidata.org/entity/Q40231",
		confidence: 0.95,
		description:
			"Formal decision-making process by which a population chooses an individual",
	},

	// Creative Works
	{
		dbpediaType: "http://dbpedia.org/ontology/Work",
		wikidataType: "http://www.wikidata.org/entity/Q386724",
		confidence: 0.9,
		description: "Intellectual or artistic creation",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/CreativeWork",
		wikidataType: "http://www.wikidata.org/entity/Q17537576",
		confidence: 0.9,
		description:
			"Content created by humans that expresses creative or artistic effort",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Artwork",
		wikidataType: "http://www.wikidata.org/entity/Q838948",
		confidence: 0.95,
		description: "Aesthetic item or artistic creation",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Book",
		wikidataType: "http://www.wikidata.org/entity/Q571",
		confidence: 1.0,
		description:
			"Medium for recording information in the form of writing or images",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Film",
		wikidataType: "http://www.wikidata.org/entity/Q11424",
		confidence: 1.0,
		description:
			"Sequence of images creating the impression of moving pictures",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/TelevisionShow",
		wikidataType: "http://www.wikidata.org/entity/Q5398426",
		confidence: 0.95,
		description:
			"Connected set of television program episodes under the same title",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Song",
		wikidataType: "http://www.wikidata.org/entity/Q7366",
		confidence: 0.95,
		description: "Musical composition with lyrics for voice performance",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/MusicalWork",
		wikidataType: "http://www.wikidata.org/entity/Q2188189",
		confidence: 0.9,
		description: "Composition of music, often created by multiple contributors",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Album",
		wikidataType: "http://www.wikidata.org/entity/Q482994",
		confidence: 0.95,
		description: "Collection of audio recordings released together",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/WrittenWork",
		wikidataType: "http://www.wikidata.org/entity/Q47461344",
		confidence: 0.9,
		description: "Text-based creation such as books, articles or manuscripts",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/AcademicArticle",
		wikidataType: "http://www.wikidata.org/entity/Q13442814",
		confidence: 0.95,
		description: "Article published in a scholarly journal",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/VideoGame",
		wikidataType: "http://www.wikidata.org/entity/Q7889",
		confidence: 0.95,
		description:
			"Electronic game that involves interaction with a user interface",
	},

	// Others
	{
		dbpediaType: "http://dbpedia.org/ontology/Software",
		wikidataType: "http://www.wikidata.org/entity/Q7397",
		confidence: 0.95,
		description: "Collection of computer programs and related data",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Language",
		wikidataType: "http://www.wikidata.org/entity/Q34770",
		confidence: 0.9,
		description:
			"Method of human communication using structured or conventional symbols",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Species",
		wikidataType: "http://www.wikidata.org/entity/Q7432",
		confidence: 0.9,
		description: "Biological classification rank between genus and subspecies",
	},
	{
		dbpediaType: "http://dbpedia.org/ontology/Disease",
		wikidataType: "http://www.wikidata.org/entity/Q12136",
		confidence: 0.95,
		description: "Particular abnormal condition negatively affecting organisms",
	},
];

/**
 * Service for mapping between DBpedia and Wikidata types
 */
export class TypeMappingService {
	private mappings: Map<string, TypeMapping[]> = new Map();

	/**
	 * Creates a new type mapping service
	 */
	constructor() {
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
