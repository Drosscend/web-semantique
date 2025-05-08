/**
 * Type Mapping Module
 *
 * This module is responsible for:
 * 1. Defining and managing mappings between equivalent types from DBpedia and Wikidata
 * 2. Enhancing entity candidates by identifying when an entity has equivalent types from both knowledge bases
 * 3. Finding corresponding Wikidata types for DBpedia types and adding them to the entity candidates
 * 4. Increasing confidence scores for entities that have matching types across both DBpedia and Wikidata
 * 5. Providing a unified view of semantic types across different knowledge bases
 */

import { logger } from "../logger";
import type { EntityCandidate, SemanticType, TypeMapping } from "../types";

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
	/**
	 * Gets equivalent types for a given type
	 * @param typeUri The URI of the type
	 * @returns An array of equivalent type mappings
	 */
	private getEquivalentTypes(typeUri: string): TypeMapping[] {
		return KNOWN_TYPE_MAPPINGS.filter(
			(mapping) =>
				mapping.dbpediaType === typeUri || mapping.wikidataType === typeUri,
		);
	}

	/**
	 * Enhances entity candidates with cross-knowledge base information
	 * @param candidates The entity candidates to enhance
	 * @returns The enhanced entity candidates
	 */
	enhanceCandidates(candidates: EntityCandidate[]): EntityCandidate[] {
		logger.info(
			"Amélioration des candidats d'entité avec les correspondances de types",
		);

		const enhancedCandidates = candidates.map((candidate) => {
			const enhancedCandidate = { ...candidate };
			let scoreAdjustment = 0;

			const typeUriMap = new Map<string, SemanticType>();
			for (const type of candidate.types) {
				typeUriMap.set(type.uri, type);
			}

			// Track new Wikidata types to add
			const newWikidataTypes: SemanticType[] = [];

			for (const type of candidate.types) {
				const equivalentTypes = this.getEquivalentTypes(type.uri);

				for (const mapping of equivalentTypes) {
					const otherTypeUri =
						type.source === "DBpedia"
							? mapping.wikidataType
							: mapping.dbpediaType;

					// If we already have this type, boost confidence
					if (typeUriMap.has(otherTypeUri)) {
						scoreAdjustment += mapping.confidence * 0.1;
						logger.debug(
							`Type correspondant trouvé: ${type.uri} <-> ${otherTypeUri} (confiance: ${mapping.confidence})`,
						);
					}
					// If this is a DBpedia type, add the corresponding Wikidata type if it doesn't exist
					else if (
						type.source === "DBpedia" &&
						!typeUriMap.has(mapping.wikidataType)
					) {
						// Create a new Wikidata type
						const wikidataType: SemanticType = {
							uri: mapping.wikidataType,
							label: this.extractLabelFromUri(mapping.wikidataType),
							source: "Wikidata",
						};

						newWikidataTypes.push(wikidataType);
						typeUriMap.set(wikidataType.uri, wikidataType);

						logger.debug(
							`Nouveau type Wikidata ajouté: ${wikidataType.uri} (${wikidataType.label}) correspondant à ${type.uri}`,
						);

						// Also boost confidence since we found a mapping
						scoreAdjustment += mapping.confidence * 0.1;
					}
				}
			}

			// Add the new Wikidata types to the candidate
			if (newWikidataTypes.length > 0) {
				enhancedCandidate.types = [...candidate.types, ...newWikidataTypes];
				logger.debug(
					`${newWikidataTypes.length} nouveaux types Wikidata ajoutés à l'entité ${candidate.entity.uri}`,
				);
			}

			enhancedCandidate.score = Math.min(
				1.0,
				candidate.score + Math.min(0.3, scoreAdjustment),
			);

			return enhancedCandidate;
		});

		logger.debug(`${candidates.length} candidats d'entité améliorés`);
		return enhancedCandidates;
	}

	/**
	 * Converts a DBpedia type to equivalent Wikidata types
	 * @param dbpediaType The DBpedia type to convert
	 * @returns An array of equivalent Wikidata types
	 */
	convertDbpediaTypeToWikidata(dbpediaType: SemanticType): SemanticType[] {
		if (dbpediaType.source !== "DBpedia") {
			return [];
		}

		const equivalentTypes = this.getEquivalentTypes(dbpediaType.uri);
		const wikidataTypes: SemanticType[] = [];

		for (const mapping of equivalentTypes) {
			const wikidataType: SemanticType = {
				uri: mapping.wikidataType,
				label: this.extractLabelFromUri(mapping.wikidataType),
				source: "Wikidata",
			};
			wikidataTypes.push(wikidataType);
		}

		return wikidataTypes;
	}

	/**
	 * Extracts a label from a URI
	 * @param uri The URI
	 * @returns The extracted label
	 */
	private extractLabelFromUri(uri: string): string {
		const parts = uri.split(/[/#]/);
		const lastPart = parts[parts.length - 1];

		// For Wikidata URIs, remove the 'Q' prefix if present
		if (uri.includes("wikidata.org") && lastPart.startsWith("Q")) {
			return `Wikidata Type ${lastPart}`;
		}

		// Convert camelCase or PascalCase to words
		return lastPart
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
	}
}

/**
 * Creates a new type mapping service with default configuration
 * @returns A new type mapping service
 */
export function createTypeMappingService(): TypeMappingService {
	return new TypeMappingService();
}
