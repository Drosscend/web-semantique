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

import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { DEFAULT_CTA_CONFIG } from "./config";
import { createProgressBar, logger } from "./logger";
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
 * Displays help information about how to use the CTA algorithm
 */
function displayHelp() {
	console.log(`
Annotation de Type de Colonne CSV vers RDF (CTA)
===============================================

UTILISATION:
  bun run src\\index.ts <chemin-fichier-csv-entrée> <chemin-dossier-csv> [options]
  bun run src\\index.ts --help

DESCRIPTION:
  Cet outil prend un fichier CSV contenant des IDs et des colonnes à analyser, puis détermine 
  automatiquement le type sémantique de chaque colonne spécifiée en utilisant les bases de connaissances 
  Wikidata et DBpedia.

  Le fichier CSV d'entrée doit être au format: ID,colonne,résultat
  Exemple:
    IUPOCN5C,0,
    BQC7DZZR,0,
    C8RTQNU5,0,

  L'outil recherche les fichiers CSV correspondants dans le dossier spécifié, analyse les colonnes
  indiquées, et remplit la troisième colonne du fichier d'entrée avec les URIs des types détectés.

ARGUMENTS:
  <chemin-fichier-csv-entrée>  Chemin vers le fichier CSV contenant les IDs et colonnes à analyser
  <chemin-dossier-csv>         Chemin vers le dossier contenant les fichiers CSV à analyser

OPTIONS:
  --help                  Affiche ce message d'aide
  --sample=N              Nombre de lignes à échantillonner (défaut: 50)
                          Valeurs plus élevées: meilleure précision, temps de traitement plus long
                          Valeurs plus basses: traitement plus rapide, précision potentiellement réduite

  --confidence=N.N        Seuil de confiance minimum (défaut: 0.3)
                          Valeurs plus élevées: annotations plus fiables mais moins nombreuses
                          Valeurs plus basses: plus d'annotations mais potentiellement moins précises

EXEMPLES:
  bun run src\\index.ts input.csv data\\dossier_csv
  bun run src\\index.ts input.csv data\\dossier_csv --sample=20 --confidence=0.5

Pour plus d'informations, consultez le README.md
`);
}

/**
 * Processes a CSV file with IDs and expected results, and fills in the results
 * @param inputCsvPath Path to the CSV file with IDs and expected results
 * @param csvDirectoryPath Path to the directory containing CSV files
 * @param config Optional configuration
 */
export async function processInputCsv(
	inputCsvPath: string,
	csvDirectoryPath: string,
	config: Partial<CTAConfig> = {},
): Promise<void> {
	try {
		logger.start(`Traitement du fichier d'entrée ${inputCsvPath}`);

		// Load the input CSV file
		const content = await Bun.file(inputCsvPath).text();
		const lines = content
			.split(/\r?\n/)
			.filter((line) => line.trim().length > 0);

		if (lines.length === 0) {
			throw new Error("Le fichier CSV d'entrée est vide");
		}

		// Parse the input CSV file
		const inputData: { id: string; columnIndex: number; result?: string }[] =
			[];
		for (const line of lines) {
			const [id, columnIndexStr, result] = line.split(",");
			const columnIndex = Number.parseInt(columnIndexStr, 10);

			if (id && !Number.isNaN(columnIndex)) {
				inputData.push({ id, columnIndex, result });
			}
		}

		logger.info(`${inputData.length} lignes trouvées dans le fichier d'entrée`);

		// Check if the CSV directory exists
		if (!existsSync(csvDirectoryPath)) {
			throw new Error(
				`Le dossier CSV spécifié n'existe pas : ${csvDirectoryPath}`,
			);
		}

		// Get all CSV files in the directory
		const files = readdirSync(csvDirectoryPath)
			.filter((file) => extname(file).toLowerCase() === ".csv")
			.map((file) => join(csvDirectoryPath, file));

		if (files.length === 0) {
			logger.warn(
				`Aucun fichier CSV trouvé dans le dossier ${csvDirectoryPath}`,
			);
			return;
		}

		logger.info(
			`${files.length} fichiers CSV trouvés dans le dossier ${csvDirectoryPath}`,
		);

		// Initialize progress tracking
		let processedCount = 0;
		const totalFiles = inputData.length;
		console.info(
			`Progression globale du traitement (${totalFiles} fichiers) :`,
		);
		console.info(createProgressBar(processedCount, totalFiles));

		// Process each input data entry
		for (const entry of inputData) {
			// Find the CSV file with the matching ID
			const csvFile = files.find((file) => basename(file, ".csv") === entry.id);

			if (!csvFile) {
				logger.warn(`Aucun fichier CSV trouvé pour l'ID ${entry.id}`);
				processedCount++;
				console.info(createProgressBar(processedCount, totalFiles));
				continue;
			}

			logger.info(
				`Traitement du fichier ${csvFile} pour l'ID ${entry.id}, colonne ${entry.columnIndex}`,
			);

			try {
				// Run the CTA algorithm
				const annotations = await runCTA(csvFile, config);

				// Find the annotation for the specified column
				const annotation = annotations.find(
					(a) => a.columnIndex === entry.columnIndex,
				);

				if (annotation) {
					// Update the result in the input data
					entry.result = annotation.assignedType.uri;
					logger.info(
						`Résultat pour ${entry.id}, colonne ${entry.columnIndex} : ${entry.result}`,
					);
				} else {
					logger.warn(
						`Aucune annotation trouvée pour la colonne ${entry.columnIndex} dans le fichier ${csvFile}`,
					);
				}
			} catch (error) {
				logger.error(
					`Erreur lors du traitement du fichier ${csvFile} : ${error instanceof Error ? error.message : String(error)}`,
				);
				// Continue with the next file
			}

			// Update progress bar after processing each file
			processedCount++;
			console.info(createProgressBar(processedCount, totalFiles));
		}

		// Save the updated input data back to the CSV file
		let outputContent = "";
		for (const entry of inputData) {
			outputContent += `${entry.id},${entry.columnIndex},${entry.result || ""}\n`;
		}

		await Bun.write(inputCsvPath, outputContent);
		logger.success(`Résultats enregistrés dans ${inputCsvPath}`);
	} catch (error) {
		logger.error(
			`Erreur lors du traitement du fichier d'entrée : ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
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

		if (args.length < 2) {
			logger.error(
				"Utilisation : bun run src\\index.ts <chemin-fichier-csv-entrée> <chemin-dossier-csv> [options]",
			);
			logger.info("Utilisez --help pour plus d'informations");
			process.exit(1);
		}

		// Extract the input paths (non-option arguments)
		const nonOptionArgs = args.filter((arg) => !arg.startsWith("--"));
		const inputCsvPath = nonOptionArgs[0];
		const csvDirectoryPath = nonOptionArgs[1];

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

		// Initialize cache configuration if not present
		if (!config.cache) {
			config.cache = {};
		}

		// Check if the input paths exist
		if (!existsSync(inputCsvPath)) {
			logger.error(
				`Le fichier CSV d'entrée spécifié n'existe pas : ${inputCsvPath}`,
			);
			process.exit(1);
		}

		if (!existsSync(csvDirectoryPath)) {
			logger.error(
				`Le dossier CSV spécifié n'existe pas : ${csvDirectoryPath}`,
			);
			process.exit(1);
		}

		// Process the input CSV file
		await processInputCsv(inputCsvPath, csvDirectoryPath, config);
	} catch (error) {
		logger.error(
			`Erreur : ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

main();
