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
import { DEFAULT_CTA_CONFIG } from "./config";
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
  bun run src\\index.ts <chemin-fichier-csv> [chemin-sortie] [options]
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
  --sample=N              Nombre de lignes à échantillonner (défaut: 10)
                          Valeurs plus élevées: meilleure précision, temps de traitement plus long
                          Valeurs plus basses: traitement plus rapide, précision potentiellement réduite

  --confidence=N.N        Seuil de confiance minimum (défaut: 0.3)
                          Valeurs plus élevées: annotations plus fiables mais moins nombreuses
                          Valeurs plus basses: plus d'annotations mais potentiellement moins précises

  --no-relations          Désactive l'analyse des relations entre colonnes
                          Accélère le traitement mais peut réduire la précision pour les colonnes liées

  --no-uri-analysis       Désactive l'analyse des URI
                          Accélère légèrement le traitement mais peut réduire la précision

CONFIGURATION AVANCÉE:
  Des options de configuration plus avancées sont disponibles via l'API programmatique
  et dans le fichier src/config.ts. Consultez le README pour plus de détails.

EXEMPLES:
  bun run src\\index.ts data\\test.csv
  bun run src\\index.ts data\\test.csv --sample=20 --confidence=0.5
  bun run src\\index.ts data\\test.csv output\\mes_annotations.json --no-relations
  bun run src\\index.ts data\\test.csv --sample=50 --no-uri-analysis

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
				"Utilisation : bun run src\\index.ts <chemin-fichier-csv> [chemin-sortie] [options]",
			);
			logger.info("Utilisez --help pour plus d'informations");
			process.exit(1);
		}

		// Extract the CSV file path (first non-option argument)
		let csvFilePath = "";
		let outputPath = "";
		const nonOptionArgs = args.filter((arg) => !arg.startsWith("--"));

		if (nonOptionArgs.length > 0) {
			csvFilePath = nonOptionArgs[0];
		}

		if (nonOptionArgs.length > 1) {
			outputPath = nonOptionArgs[1];
		} else {
			outputPath = join(
				process.cwd(),
				"output",
				`${csvFilePath
					.split(/[\/\\]/)
					.pop()
					?.replace(".csv", "")}_annotations.json`,
			);
		}

		// Parse configuration options
		const config: Partial<CTAConfig> = {};

		// Parse sample size
		const sampleArg = args.find((arg) => arg.startsWith("--sample="));
		if (sampleArg) {
			const sampleSize = Number.parseInt(sampleArg.split("=")[1], 10);
			if (!Number.isNaN(sampleSize) && sampleSize >= 0) {
				config.sampleSize = sampleSize;
				logger.info(`Taille d'échantillon configurée à ${sampleSize}`);
			} else {
				logger.warn(
					"Valeur invalide pour --sample, utilisation de la valeur par défaut",
				);
			}
		}

		// Parse confidence threshold
		const confidenceArg = args.find((arg) => arg.startsWith("--confidence="));
		if (confidenceArg) {
			const confidence = Number.parseFloat(confidenceArg.split("=")[1]);
			if (!Number.isNaN(confidence) && confidence >= 0 && confidence <= 1) {
				config.confidenceThreshold = confidence;
				logger.info(`Seuil de confiance configuré à ${confidence}`);
			} else {
				logger.warn(
					"Valeur invalide pour --confidence, utilisation de la valeur par défaut",
				);
			}
		}

		// Parse column relations flag
		if (args.includes("--no-relations")) {
			config.useColumnRelations = false;
			logger.info("Analyse des relations entre colonnes désactivée");
		}

		// Parse URI analysis flag
		if (args.includes("--no-uri-analysis")) {
			config.useURIAnalysis = false;
			logger.info("Analyse des URI désactivée");
		}

		// Run the CTA algorithm with the configured options
		const annotations = await runCTA(csvFilePath, config);

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
