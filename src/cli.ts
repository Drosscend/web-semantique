/**
 * CLI (Command Line Interface) functionality for the CTA algorithm
 *
 * This module contains the CLI and interactive menu functionality for the CTA algorithm, including:
 * 1. Command-line argument processing
 * 2. Interactive menu system
 * 3. Batch processing functionality
 * 4. Single file processing functionality
 */

import { existsSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { runCTA } from "./cta";
import { logger, updateProgressBar } from "./logger";
import type { CTAConfig } from "./types";

/**
 * Displays help information about how to use the CTA algorithm
 */
export function displayHelp() {
	console.log(`
Annotation de Type de Colonne CSV vers RDF (CTA)
===============================================

UTILISATION:
  bun run src\\index.ts                           # Lance l'interface interactive avec menu
  bun run src\\index.ts --help                    # Affiche ce message d'aide

DESCRIPTION:
  Cet outil détermine automatiquement le type sémantique des colonnes dans des fichiers CSV
  en utilisant les bases de connaissances Wikidata et DBpedia.

  L'application propose deux modes de fonctionnement:

  1. Mode simple: Traite un seul fichier CSV et affiche les résultats dans la console
  2. Mode batch: Traite un lot de fichiers CSV basé sur un fichier d'entrée et un dossier de fichiers CSV

  En mode batch, le fichier CSV d'entrée doit être au format: ID,colonne,résultat
  Exemple:
    IUPOCN5C,0,
    BQC7DZZR,0,
    C8RTQNU5,0,

  L'outil recherche les fichiers CSV correspondants dans le dossier spécifié, analyse les colonnes
  indiquées, et remplit la troisième colonne du fichier d'entrée avec les URIs des types détectés.

MODES:
  Mode interactif:
    Lance une interface interactive avec un menu permettant de choisir entre le mode simple et le mode batch,
    et de configurer les options comme la taille d'échantillon et le seuil de confiance.

    Le menu propose également:
    - Des presets de configuration (basse/moyenne/haute précision)
    - Des options avancées pour l'analyse des relations entre colonnes et des URI
    - Des paramètres de cache pour optimiser les performances

OPTIONS:
  --help                  Affiche ce message d'aide

EXEMPLES:
  bun run src\\index.ts                           # Lance l'interface interactive

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
		const totalFiles = files.length;
		logger.info(
			`Progression globale du traitement (${totalFiles} fichiers dans le dossier) :`,
		);
		updateProgressBar(processedCount, totalFiles);

		// Create a map to track which files have been processed
		const processedFiles = new Set<string>();

		// Process each input data entry
		for (const entry of inputData) {
			// Find the CSV file with the matching ID
			const csvFile = files.find((file) => basename(file, ".csv") === entry.id);

			if (!csvFile) {
				logger.warn(`Aucun fichier CSV trouvé pour l'ID ${entry.id}`);
				continue;
			}

			// Skip if we've already processed this file
			if (processedFiles.has(csvFile)) {
				continue;
			}

			// Mark this file as processed
			processedFiles.add(csvFile);

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

				// Save the updated result immediately to the CSV file
				let outputContent = "";
				for (const item of inputData) {
					outputContent += `${item.id},${item.columnIndex},${item.result || ""}\n`;
				}
				await Bun.write(inputCsvPath, outputContent);
				logger.info(
					`Résultat enregistré dans ${inputCsvPath} pour l'ID ${entry.id}`,
				);
			} catch (error) {
				logger.error(
					`Erreur lors du traitement du fichier ${csvFile} : ${error instanceof Error ? error.message : String(error)}`,
				);
				// Continue with the next file
			}

			// Update progress bar after processing each file
			processedCount = processedFiles.size;
			updateProgressBar(processedCount, totalFiles);
		}

		logger.success(
			`Tous les résultats ont été enregistrés dans ${inputCsvPath}`,
		);
	} catch (error) {
		logger.error(
			`Erreur lors du traitement du fichier d'entrée : ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

/**
 * Process a single CSV file and display the results in the console
 * @param csvFilePath Path to the CSV file to process
 * @param config Configuration options
 */
export async function processSingleFile(
	csvFilePath: string,
	config: Partial<CTAConfig> = {},
): Promise<void> {
	try {
		logger.box("Mode simple - Traitement d'un seul fichier CSV");
		logger.info(`Fichier à traiter: ${csvFilePath}`);

		// Check if the file exists
		if (!existsSync(csvFilePath)) {
			logger.error(`Le fichier CSV spécifié n'existe pas : ${csvFilePath}`);
			return;
		}

		// Run the CTA algorithm
		logger.start("Analyse du fichier CSV...");
		const annotations = await runCTA(csvFilePath, config);
		logger.success("Analyse terminée !");

		// Display the results
		logger.box("Résultats de l'annotation de type de colonne");

		if (annotations.length === 0) {
			logger.info("Aucune annotation trouvée.");
			return;
		}

		// Display results in a list format
		for (const annotation of annotations) {
			logger.info(
				`Colonne ${annotation.columnIndex} (${annotation.columnHeader})`,
			);
			logger.info(
				`  Type principal: ${annotation.assignedType.label} - ${(annotation.confidence * 100).toFixed(0)}% - ${annotation.assignedType.uri}`,
			);

			if (annotation.alternativeTypes.length > 0) {
				logger.info("  Types alternatifs:");
				for (const alt of annotation.alternativeTypes.slice(0, 3)) {
					logger.info(
						`    • ${alt.type.label} - ${(alt.confidence * 100).toFixed(0)}%`,
					);
				}
			}
			logger.info(""); // Empty line between annotations
		}

		logger.success("Traitement terminé avec succès !");
	} catch (error) {
		logger.error(
			`Erreur lors du traitement du fichier : ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

/**
 * Main function to run the CTA algorithm from the command line
 */
export async function main() {
	try {
		// Parse command line arguments
		const args = process.argv.slice(2);

		// Check for help flag
		if (args.includes("--help") || args.includes("-h")) {
			displayHelp();
			return;
		}

		// Welcome message with consola examples
		logger.start("Démarrage de l'application...");

		// Display a box with the application title
		logger.box("Annotation de Type de Colonne CSV vers RDF (CTA)");

		// Example error (for demonstration purposes)
		if (Math.random() < 0.3) {
			// Only show this occasionally
			logger.error(new Error("Ceci est un exemple d'erreur. Tout va bien !"));
		}

		logger.success("Application démarrée avec succès!");

		// Configuration options
		const config: Partial<CTAConfig> = {};

		// Initialize cache configuration if not present
		if (!config.cache) {
			config.cache = {};
		}

		// Interactive menu mode
		// First, offer configuration presets
		const configPreset = await logger.prompt(
			"Choisissez un preset de configuration:",
			{
				type: "select",
				options: [
					{ value: "custom", label: "Configuration personnalisée" },
					{ value: "low", label: "Précision basse (traitement rapide)" },
					{ value: "medium", label: "Précision moyenne (équilibré)" },
					{ value: "high", label: "Précision élevée (traitement plus lent)" },
				],
			},
		);

		// Apply preset configurations
		if (configPreset === "low") {
			config.sampleSize = 20;
			config.confidenceThreshold = 0.2;
			config.useColumnRelations = false;
			config.useURIAnalysis = false;
			logger.info("Preset de précision basse appliqué:");
			logger.info("- Taille d'échantillon: 20");
			logger.info("- Seuil de confiance: 0.2");
			logger.info("- Analyse des relations entre colonnes: désactivée");
			logger.info("- Analyse des URI: désactivée");
		} else if (configPreset === "medium") {
			config.sampleSize = 50;
			config.confidenceThreshold = 0.3;
			config.useColumnRelations = true;
			config.useURIAnalysis = true;
			logger.info("Preset de précision moyenne appliqué:");
			logger.info("- Taille d'échantillon: 50");
			logger.info("- Seuil de confiance: 0.3");
			logger.info("- Analyse des relations entre colonnes: activée");
			logger.info("- Analyse des URI: activée");
		} else if (configPreset === "high") {
			config.sampleSize = 100;
			config.confidenceThreshold = 0.4;
			config.useColumnRelations = true;
			config.useURIAnalysis = true;
			logger.info("Preset de précision élevée appliqué:");
			logger.info("- Taille d'échantillon: 100");
			logger.info("- Seuil de confiance: 0.4");
			logger.info("- Analyse des relations entre colonnes: activée");
			logger.info("- Analyse des URI: activée");
		} else {
			// Custom configuration
			logger.info("Configuration personnalisée sélectionnée");
		}

		// Choose processing mode
		const mode = await logger.prompt("Choisissez un mode de traitement:", {
			type: "select",
			options: [
				{ value: "simple", label: "Mode simple (traiter un seul fichier CSV)" },
				{
					value: "batch",
					label: "Mode batch (traiter un lot de fichiers CSV)",
				},
			],
		});

		// Only show custom configuration options if custom preset was selected
		if (configPreset === "custom") {
			// Configure sample size
			const sampleSizeStr = await logger.prompt(
				"Nombre de lignes à échantillonner (défaut: 50):",
				{
					type: "text",
					initial: "50",
				},
			);

			const sampleSize = Number.parseInt(sampleSizeStr, 10);
			if (!Number.isNaN(sampleSize) && sampleSize >= 0) {
				config.sampleSize = sampleSize;
				logger.info(`Taille d'échantillon configurée à ${sampleSize}`);
			} else {
				logger.warn(
					"Valeur invalide pour la taille d'échantillon, utilisation de la valeur par défaut (50)",
				);
			}

			// Configure confidence threshold
			const confidenceStr = await logger.prompt(
				"Seuil de confiance minimum (défaut: 0.3):",
				{
					type: "text",
					initial: "0.3",
				},
			);

			const confidence = Number.parseFloat(confidenceStr);
			if (!Number.isNaN(confidence) && confidence >= 0 && confidence <= 1) {
				config.confidenceThreshold = confidence;
				logger.info(`Seuil de confiance configuré à ${confidence}`);
			} else {
				logger.warn(
					"Valeur invalide pour le seuil de confiance, utilisation de la valeur par défaut (0.3)",
				);
			}

			// Configure column relations analysis
			const useColumnRelations = await logger.prompt(
				"Activer l'analyse des relations entre colonnes? (améliore la précision mais ralentit le traitement)",
				{
					type: "confirm",
					initial: true,
				},
			);
			config.useColumnRelations = useColumnRelations;
			logger.info(
				`Analyse des relations entre colonnes: ${useColumnRelations ? "activée" : "désactivée"}`,
			);

			// Configure URI analysis
			const useURIAnalysis = await logger.prompt(
				"Activer l'analyse des URI? (améliore la précision pour les entités ambiguës)",
				{
					type: "confirm",
					initial: true,
				},
			);
			config.useURIAnalysis = useURIAnalysis;
			logger.info(
				`Analyse des URI: ${useURIAnalysis ? "activée" : "désactivée"}`,
			);

			// Ask if user wants to configure advanced options
			const configureAdvanced = await logger.prompt(
				"Configurer les options avancées?",
				{
					type: "confirm",
					initial: false,
				},
			);

			if (configureAdvanced) {
				// Configure cache size for Wikidata
				const wikidataCacheSizeStr = await logger.prompt(
					"Taille du cache Wikidata (défaut: 50000):",
					{
						type: "text",
						initial: "50000",
					},
				);

				const wikidataCacheSize = Number.parseInt(wikidataCacheSizeStr, 10);
				if (!Number.isNaN(wikidataCacheSize) && wikidataCacheSize >= 0) {
					if (!config.cache) config.cache = {};
					config.cache.wikidataMaxSize = wikidataCacheSize;
					logger.info(
						`Taille du cache Wikidata configurée à ${wikidataCacheSize}`,
					);
				} else {
					logger.warn(
						"Valeur invalide pour la taille du cache Wikidata, utilisation de la valeur par défaut (50000)",
					);
				}

				// Configure cache size for DBpedia
				const dbpediaCacheSizeStr = await logger.prompt(
					"Taille du cache DBpedia (défaut: 50000):",
					{
						type: "text",
						initial: "50000",
					},
				);

				const dbpediaCacheSize = Number.parseInt(dbpediaCacheSizeStr, 10);
				if (!Number.isNaN(dbpediaCacheSize) && dbpediaCacheSize >= 0) {
					if (!config.cache) config.cache = {};
					config.cache.dbpediaMaxSize = dbpediaCacheSize;
					logger.info(
						`Taille du cache DBpedia configurée à ${dbpediaCacheSize}`,
					);
				} else {
					logger.warn(
						"Valeur invalide pour la taille du cache DBpedia, utilisation de la valeur par défaut (50000)",
					);
				}
			}
		}

		if (mode === "simple") {
			// Simple mode - process a single file
			const filePath = await logger.prompt(
				"Entrez le chemin du fichier CSV à traiter:",
				{
					type: "text",
				},
			);

			// Process the file
			await processSingleFile(filePath, config);
		} else {
			// Batch mode - process multiple files
			const inputCsvPath = await logger.prompt(
				"Entrez le chemin du fichier CSV d'entrée:",
				{
					type: "text",
				},
			);

			const csvDirectoryPath = await logger.prompt(
				"Entrez le chemin du dossier contenant les fichiers CSV à analyser:",
				{
					type: "text",
				},
			);

			// Check if the input paths exist
			if (!existsSync(inputCsvPath)) {
				logger.error(
					`Le fichier CSV d'entrée spécifié n'existe pas : ${inputCsvPath}`,
				);
				return;
			}

			if (!existsSync(csvDirectoryPath)) {
				logger.error(
					`Le dossier CSV spécifié n'existe pas : ${csvDirectoryPath}`,
				);
				return;
			}

			// Process the input CSV file
			await processInputCsv(inputCsvPath, csvDirectoryPath, config);
		}
	} catch (error) {
		logger.error(
			`Erreur : ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}
