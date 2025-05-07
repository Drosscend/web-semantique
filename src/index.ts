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
import { basename, join, extname } from "node:path";
import { existsSync, statSync, readdirSync } from "node:fs";
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
 * Saves the column type annotations to a CSV file in the format: filename,column,uri
 * @param annotations The annotations to save
 * @param csvFilePath The original CSV file path
 */
export async function saveAnnotationsToCSV(
	annotations: ColumnTypeAnnotation[],
	csvFilePath: string,
): Promise<void> {
	try {
		const outputDir = join(process.cwd(), "output");
		const outputPath = join(outputDir, "cta_ft.csv");

		// Get filename without extension
		const fileNameWithExt = basename(csvFilePath);
		const fileName = fileNameWithExt.replace(/\.[^/.]+$/, "");

		// Create output directory if it doesn't exist
		try {
			await mkdir(outputDir, { recursive: true });
		} catch (error) {
			// Ignore if directory already exists
		}

		// Create CSV content
		let csvContent = "";

		for (const annotation of annotations) {
			csvContent += `${fileName},${annotation.columnIndex},${annotation.assignedType.uri}\n`;
		}

		// Check if file exists and append to it instead of replacing
		if (existsSync(outputPath)) {
			// Read existing content
			const existingContent = await Bun.file(outputPath).text();
			// Append new content to existing content
			csvContent = existingContent + csvContent;
		}

		// Save the CSV file
		await Bun.write(outputPath, csvContent);

		logger.success(`Annotations CSV enregistrées dans ${outputPath}`);
	} catch (error) {
		logger.error(
			`Erreur lors de l'enregistrement des annotations CSV : ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

/**
 * Processes all CSV files in a directory and saves the results to a single cta_ft.csv file
 * @param directoryPath Path to the directory containing CSV files
 * @param config Optional configuration
 */
export async function processDirectory(
	directoryPath: string,
	config: Partial<CTAConfig> = {},
): Promise<void> {
	try {
		logger.start(`Traitement du dossier ${directoryPath}`);

		// Get all CSV files in the directory
		const files = readdirSync(directoryPath)
			.filter(file => extname(file).toLowerCase() === '.csv')
			.map(file => join(directoryPath, file));

		if (files.length === 0) {
			logger.warn(`Aucun fichier CSV trouvé dans le dossier ${directoryPath}`);
			return;
		}

		logger.info(`${files.length} fichiers CSV trouvés dans le dossier ${directoryPath}`);

		// Process each CSV file
		for (const csvFile of files) {
			logger.info(`Traitement du fichier ${csvFile}`);

			try {
				// Run the CTA algorithm
				const annotations = await runCTA(csvFile, config);

				// Save the annotations to CSV only (skip JSON)
				await saveAnnotationsToCSV(annotations, csvFile);

				// Print a summary
				logger.info(`Résumé des annotations pour ${basename(csvFile)} :`);
				for (const annotation of annotations) {
					logger.info(
						`Colonne "${annotation.columnHeader}" : ${annotation.assignedType.label} (${annotation.confidence.toFixed(2)})`,
					);
				}
			} catch (error) {
				logger.error(
					`Erreur lors du traitement du fichier ${csvFile} : ${error instanceof Error ? error.message : String(error)}`,
				);
				// Continue with the next file
			}
		}

		logger.success(`Traitement du dossier ${directoryPath} terminé`);
	} catch (error) {
		logger.error(
			`Erreur lors du traitement du dossier : ${error instanceof Error ? error.message : String(error)}`,
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
  bun run src\\index.ts <chemin-fichier-csv-ou-dossier> [chemin-sortie] [options]
  bun run src\\index.ts --help

DESCRIPTION:
  Cet outil analyse un fichier CSV ou un dossier contenant des fichiers CSV et détermine 
  automatiquement le type sémantique de chaque colonne en utilisant les bases de connaissances 
  Wikidata et DBpedia.

  Pour un fichier unique, les résultats sont enregistrés à la fois au format JSON et dans un fichier CSV
  nommé "cta_ft.csv" dans le répertoire "output" au format: nom_fichier_sans_extension,colonne,uri.

  Pour un dossier, tous les fichiers CSV sont traités et les résultats sont combinés dans un seul 
  fichier "cta_ft.csv" (sans générer de fichiers JSON).

ARGUMENTS:
  <chemin-fichier-csv-ou-dossier>  Chemin vers le fichier CSV à analyser ou un dossier contenant des fichiers CSV
  [chemin-sortie]                  Chemin optionnel pour le fichier de sortie JSON (uniquement pour un fichier CSV unique)
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

  --wikidata-cache=N      Taille maximale du cache Wikidata (défaut: 1000)
                          Valeurs plus élevées: meilleur taux de succès du cache, plus de mémoire utilisée
                          Valeurs plus basses: moins de mémoire utilisée, taux de succès potentiellement réduit

  --dbpedia-cache=N       Taille maximale du cache DBpedia (défaut: 1000)
                          Valeurs plus élevées: meilleur taux de succès du cache, plus de mémoire utilisée
                          Valeurs plus basses: moins de mémoire utilisée, taux de succès potentiellement réduit

  --cache-max-age=N       Durée de vie maximale des entrées du cache en millisecondes
                          Non spécifié: les entrées expirent uniquement via l'éviction LRU
                          Spécifié: assure la fraîcheur des données mais réduit l'efficacité du cache

  --no-cache              Désactive complètement le cache
                          Utile pour les tests ou pour forcer des requêtes fraîches

CONFIGURATION AVANCÉE:
  Des options de configuration plus avancées sont disponibles via l'API programmatique
  et dans le fichier src/config.ts. Consultez le README pour plus de détails.

EXEMPLES:
  bun run src\\index.ts data\\test.csv
  bun run src\\index.ts data\\test.csv --sample=20 --confidence=0.5
  bun run src\\index.ts data\\test.csv output\\mes_annotations.json --no-relations
  bun run src\\index.ts data\\dossier_csv  # Traite tous les fichiers CSV dans le dossier
  bun run src\\index.ts data\\dossier_csv --sample=50 --no-uri-analysis
  bun run src\\index.ts data\\test.csv --wikidata-cache=2000 --dbpedia-cache=2000
  bun run src\\index.ts data\\test.csv --cache-max-age=3600000 # 1 heure
  bun run src\\index.ts data\\test.csv --no-cache # Désactive le cache

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
				"Utilisation : bun run src\\index.ts <chemin-fichier-csv-ou-dossier> [chemin-sortie] [options]",
			);
			logger.info("Utilisez --help pour plus d'informations");
			process.exit(1);
		}

		// Extract the input path (first non-option argument)
		let inputPath = "";
		let outputPath = "";
		const nonOptionArgs = args.filter((arg) => !arg.startsWith("--"));

		if (nonOptionArgs.length > 0) {
			inputPath = nonOptionArgs[0];
		}

		if (nonOptionArgs.length > 1) {
			outputPath = nonOptionArgs[1];
		} else {
			outputPath = join(
				process.cwd(),
				"output",
				`${inputPath
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

		// Initialize cache configuration if not present
		if (!config.cache) {
			config.cache = {};
		}

		// Parse Wikidata cache size
		const wikidataCacheArg = args.find((arg) =>
			arg.startsWith("--wikidata-cache="),
		);
		if (wikidataCacheArg) {
			const cacheSize = Number.parseInt(wikidataCacheArg.split("=")[1], 10);
			if (!Number.isNaN(cacheSize) && cacheSize >= 0) {
				config.cache.wikidataMaxSize = cacheSize;
				logger.info(`Taille du cache Wikidata configurée à ${cacheSize}`);
			} else {
				logger.warn(
					"Valeur invalide pour --wikidata-cache, utilisation de la valeur par défaut",
				);
			}
		}

		// Parse DBpedia cache size
		const dbpediaCacheArg = args.find((arg) =>
			arg.startsWith("--dbpedia-cache="),
		);
		if (dbpediaCacheArg) {
			const cacheSize = Number.parseInt(dbpediaCacheArg.split("=")[1], 10);
			if (!Number.isNaN(cacheSize) && cacheSize >= 0) {
				config.cache.dbpediaMaxSize = cacheSize;
				logger.info(`Taille du cache DBpedia configurée à ${cacheSize}`);
			} else {
				logger.warn(
					"Valeur invalide pour --dbpedia-cache, utilisation de la valeur par défaut",
				);
			}
		}

		// Parse cache max age
		const cacheMaxAgeArg = args.find((arg) =>
			arg.startsWith("--cache-max-age="),
		);
		if (cacheMaxAgeArg) {
			const maxAge = Number.parseInt(cacheMaxAgeArg.split("=")[1], 10);
			if (!Number.isNaN(maxAge) && maxAge >= 0) {
				config.cache.maxAge = maxAge;
				logger.info(`Durée de vie maximale du cache configurée à ${maxAge}ms`);
			} else {
				logger.warn(
					"Valeur invalide pour --cache-max-age, utilisation de la valeur par défaut",
				);
			}
		}

		// Parse no-cache flag
		if (args.includes("--no-cache")) {
			// Set cache sizes to 0 to effectively disable caching
			config.cache.wikidataMaxSize = 0;
			config.cache.dbpediaMaxSize = 0;
			logger.info("Cache désactivé");
		}

		// Check if the input path exists
		if (!existsSync(inputPath)) {
			logger.error(`Le chemin spécifié n'existe pas : ${inputPath}`);
			process.exit(1);
		}

		// Check if the input path is a directory or a file
		const isDirectory = statSync(inputPath).isDirectory();

		if (isDirectory) {
			// Process all CSV files in the directory
			logger.info(`Le chemin spécifié est un dossier : ${inputPath}`);
			await processDirectory(inputPath, config);
		} else {
			// Process a single CSV file
			logger.info(`Le chemin spécifié est un fichier : ${inputPath}`);

			// Run the CTA algorithm with the configured options
			const annotations = await runCTA(inputPath, config);

			// Save the annotations to JSON
			await saveAnnotations(annotations, outputPath);

			// Save the annotations to CSV
			await saveAnnotationsToCSV(annotations, inputPath);

			// Print a summary
			logger.info("Résumé des annotations :");
			for (const annotation of annotations) {
				logger.info(
					`Colonne "${annotation.columnHeader}" : ${annotation.assignedType.label} (${annotation.confidence.toFixed(2)})`,
				);
			}
		}
	} catch (error) {
		logger.error(
			`Erreur : ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

main();
