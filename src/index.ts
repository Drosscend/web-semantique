/**
 * CSV to RDF Column Type Annotation (CTA) Main Entry Point
 *
 * This is the main entry point for the CTA algorithm, which:
 * 1. Loads and prepares the CSV data
 * 2. Corrects the data
 * 3. Searches for entities
 * 4. Maps between DBpedia and Wikidata types
 * 5. Analyzes column relationships
 * 6. Analyzes URIs
 * 7. Extracts types
 * 8. Aggregates and votes on the final types
 * 9. Outputs the results
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "./logger";
import type { CTAConfig, ColumnRelation, ColumnTypeAnnotation } from "./types";

import { analyzeColumnRelationships } from "./modules/columnRelationship";
import { correctCells } from "./modules/dataCorrection";
import { cleanCSVData, extractCells, loadCSV } from "./modules/dataPreparation";
import { searchEntities } from "./modules/entitySearch";
import { aggregateColumnTypes } from "./modules/typeAggregation";
import { extractTypesForAllColumns } from "./modules/typeExtraction";
import { createTypeMappingService } from "./modules/typeMapping";
import { analyzeURIs } from "./modules/uriAnalysis";

/**
 * Default configuration for the CTA algorithm
 */
const DEFAULT_CONFIG: CTAConfig = {
	sampleSize: 10,
	confidenceThreshold: 0.3,
	useColumnRelations: true,
	useURIAnalysis: true,
	sparqlEndpoints: {
		wikidata: "https://query.wikidata.org/sparql",
		dbpedia: "https://dbpedia.org/sparql",
	},
};

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
	const mergedConfig: CTAConfig = { ...DEFAULT_CONFIG, ...config };

	try {
		logger.start(
			`Démarrage de l'annotation de type de colonne pour ${csvFilePath}`,
		);
		logger.info("Configuration :", mergedConfig);

		// Step 1: Load and prepare the CSV data
		logger.info("Étape 1 : Chargement et préparation des données CSV");
		const csvTable = await loadCSV(csvFilePath);
		const cleanedTable = cleanCSVData(csvTable);
		const columnCells = extractCells(cleanedTable, mergedConfig);

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
			cleanedTable.headers,
			columnRelations,
		);

		const duration = (Date.now() - startTime) / 1000;
		logger.success(
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

/**
 * Saves the column type annotations to a JSON file
 * @param annotations The annotations to save
 * @param outputPath The path to save the annotations to
 */
export async function saveAnnotations(
	annotations: ColumnTypeAnnotation[],
	outputPath: string,
): Promise<void> {
	try {
		const outputDir = outputPath
			.split(/[\/\\]/)
			.slice(0, -1)
			.join("/");

		// Create the output directory if it doesn't exist
		try {
			await mkdir(outputDir, { recursive: true });
		} catch (error) {
			// Ignore if directory already exists
		}

		// Save the annotations
		await Bun.write(outputPath, JSON.stringify(annotations, null, 2));

		logger.success(`Annotations enregistrées dans ${outputPath}`);
	} catch (error) {
		logger.error(
			`Erreur lors de l'enregistrement des annotations : ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

/**
 * Displays help information about how to use the CTA algorithm
 */
function displayHelp() {
	console.log(`
Annotation de Type de Colonne CSV vers RDF (CTA)
===============================================

UTILISATION:
  bun run src\\index.ts <chemin-fichier-csv> [chemin-sortie]
  bun run src\\index.ts --help

DESCRIPTION:
  Cet outil analyse un fichier CSV et détermine automatiquement le type sémantique
  de chaque colonne en utilisant les bases de connaissances Wikidata et DBpedia.

ARGUMENTS:
  <chemin-fichier-csv>    Chemin vers le fichier CSV à analyser
  [chemin-sortie]         Chemin optionnel pour le fichier de sortie JSON
                          (par défaut: output/<nom-fichier>_annotations.json)

OPTIONS:
  --help                  Affiche ce message d'aide

CONFIGURATION:
  La configuration peut être modifiée en utilisant l'API programmatique:

  - sampleSize            Nombre de lignes à échantillonner (défaut: 10)
  - confidenceThreshold   Seuil de confiance minimum (défaut: 0.3)
  - useColumnRelations    Utiliser l'analyse des relations (défaut: true)
  - useURIAnalysis        Utiliser l'analyse des URI (défaut: true)
  - sparqlEndpoints       Points d'accès SPARQL personnalisés

EXEMPLES:
  bun run src\\index.ts data\\test.csv
  bun run src\\index.ts data\\test.csv output\\mes_annotations.json

Pour plus d'informations, consultez le README.md
`);
}

/**
 * Main function to run the CTA algorithm from the command line
 */
async function main() {
	try {
		// Parse command line arguments
		const args = process.argv.slice(2);

		// Check for help flag
		if (args.includes("--help") || args.includes("-h")) {
			displayHelp();
			return;
		}

		if (args.length < 1) {
			logger.error(
				"Utilisation : bun run src\\index.ts <chemin-fichier-csv> [chemin-sortie]",
			);
			logger.info("Utilisez --help pour plus d'informations");
			process.exit(1);
		}

		const csvFilePath = args[0];
		const outputPath =
			args[1] ||
			join(
				process.cwd(),
				"output",
				`${csvFilePath
					.split(/[\/\\]/)
					.pop()
					?.replace(".csv", "")}_annotations.json`,
			);

		// Run the CTA algorithm
		const annotations = await runCTA(csvFilePath);

		// Save the annotations
		await saveAnnotations(annotations, outputPath);

		// Print a summary
		logger.info("Résumé des annotations :");
		for (const annotation of annotations) {
			logger.info(
				`Colonne "${annotation.columnHeader}" : ${annotation.assignedType.label} (${annotation.confidence.toFixed(2)})`,
			);
		}
	} catch (error) {
		logger.error(
			`Erreur : ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

main();
