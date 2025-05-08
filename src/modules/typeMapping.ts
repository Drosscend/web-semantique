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
import { KNOWN_TYPE_MAPPINGS } from "../dataset/typeMappingDataset";

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
