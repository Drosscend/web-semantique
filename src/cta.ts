/**
 * Core CTA (Column Type Annotation) functionality
 *
 * This module contains the core functionality for the CTA algorithm, which:
 * 1. Loads and prepares the CSV data
 * 2. Corrects the data
 * 3. Searches for entities
 * 4. Maps between DBpedia and Wikidata types
 * 5. Analyzes column relationships
 * 6. Analyzes URIs
 * 7. Extracts types
 * 8. Aggregates and votes on the final types
 * 9. Returns the results
 */

import { DEFAULT_CTA_CONFIG } from "./config";
import { logger } from "./logger";
import type { CTAConfig, ColumnRelation, ColumnTypeAnnotation } from "./types";

import { analyzeColumnRelationships } from "./modules/columnRelationship";
import { correctCells } from "./modules/dataCorrection";
import { extractCells, loadCSV } from "./modules/dataPreparation";
import { searchEntities } from "./modules/entitySearch";
import { aggregateColumnTypes } from "./modules/typeAggregation";
import { extractTypesForAllColumns } from "./modules/typeExtraction";
import { createTypeMappingService } from "./modules/typeMapping";
import { analyzeURIs } from "./modules/uriAnalysis";

/**
 * Runs the Column Type Annotation algorithm on a CSV file
 * @param csvFilePath Path to the CSV file
 * @param config Optional configuration
 * @returns Promise resolving to the column type annotations
 */
export async function runCTA(
	csvFilePath: string,
	config: Partial<CTAConfig> = {},
): Promise<ColumnTypeAnnotation[]> {
	const startTime = Date.now();
	const mergedConfig: CTAConfig = { ...DEFAULT_CTA_CONFIG, ...config };

	try {
		logger.info(
			`Démarrage de l'annotation de type de colonne pour ${csvFilePath}`,
		);
		logger.info("Configuration :", mergedConfig);

		// Step 1: Load and prepare the CSV data
		logger.info("Étape 1 : Chargement et préparation des données CSV");
		const csvTable = await loadCSV(csvFilePath);
		const columnCells = extractCells(csvTable, mergedConfig);

		// Step 2: Correct the data
		logger.info("Étape 2 : Correction des données");
		const correctedCells = correctCells(columnCells);

		// Step 3: Search for entities
		logger.info("Étape 3 : Recherche d'entités");
		const entityCandidates = await searchEntities(correctedCells, mergedConfig);

		// Step 4: Map between DBpedia and Wikidata types
		logger.info("Étape 4 : Correspondance entre les types DBpedia et Wikidata");
		const typeMappingService = createTypeMappingService();
		const enhancedCandidates = entityCandidates.map((columnCandidates) =>
			columnCandidates.map(
				(candidate) => typeMappingService.enhanceCandidates([candidate])[0],
			),
		);

		// Step 5: Analyze column relationships (if enabled)
		let columnRelations: ColumnRelation[] = [];
		if (mergedConfig.useColumnRelations) {
			logger.info("Étape 5 : Analyse des relations entre colonnes");
			columnRelations = analyzeColumnRelationships(enhancedCandidates);
		} else {
			logger.info(
				"Étape 5 : Analyse des relations entre colonnes ignorée (désactivée dans la configuration)",
			);
		}

		// Step 6: Analyze URIs (if enabled)
		let uriEnhancedCandidates = enhancedCandidates;
		if (mergedConfig.useURIAnalysis) {
			logger.info("Étape 6 : Analyse des URI");
			uriEnhancedCandidates = analyzeURIs(enhancedCandidates);
		} else {
			logger.info(
				"Étape 6 : Analyse des URI ignorée (désactivée dans la configuration)",
			);
		}

		// Step 7: Extract types
		logger.info("Étape 7 : Extraction des types");
		const columnTypes = await extractTypesForAllColumns(uriEnhancedCandidates);

		// Step 8: Aggregate and vote on the final types
		logger.info("Étape 8 : Agrégation et vote sur les types finaux");
		const annotations = aggregateColumnTypes(
			columnTypes,
			csvTable.headers,
			columnRelations,
		);

		const duration = (Date.now() - startTime) / 1000;
		logger.info(
			`Annotation de type de colonne terminée en ${duration.toFixed(2)} secondes`,
		);

		return annotations;
	} catch (error) {
		logger.error(
			`Erreur lors de l'exécution de CTA : ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}
