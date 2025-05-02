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
import { consola } from "consola";
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
	sampleSize: 5,
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
		consola.start(
			`Démarrage de l'annotation de type de colonne pour ${csvFilePath}`,
		);
		consola.info("Configuration :", mergedConfig);

		// Step 1: Load and prepare the CSV data
		consola.info("Étape 1 : Chargement et préparation des données CSV");
		const csvTable = await loadCSV(csvFilePath);
		const cleanedTable = cleanCSVData(csvTable);
		const columnCells = extractCells(cleanedTable, mergedConfig);

		// Step 2: Correct the data
		consola.info("Étape 2 : Correction des données");
		const correctedCells = correctCells(columnCells);

		// Step 3: Search for entities
		consola.info("Étape 3 : Recherche d'entités");
		const entityCandidates = await searchEntities(correctedCells, mergedConfig);

		// Step 4: Map between DBpedia and Wikidata types
		consola.info(
			"Étape 4 : Correspondance entre les types DBpedia et Wikidata",
		);
		const typeMappingService = createTypeMappingService();
		const enhancedCandidates = entityCandidates.map((columnCandidates) =>
			columnCandidates.map(
				(candidate) => typeMappingService.enhanceCandidates([candidate])[0],
			),
		);

		// Step 5: Analyze column relationships (if enabled)
		let columnRelations: ColumnRelation[] = [];
		if (mergedConfig.useColumnRelations) {
			consola.info("Étape 5 : Analyse des relations entre colonnes");
			columnRelations = analyzeColumnRelationships(enhancedCandidates);
		} else {
			consola.info(
				"Étape 5 : Analyse des relations entre colonnes ignorée (désactivée dans la configuration)",
			);
		}

		// Step 6: Analyze URIs (if enabled)
		let uriEnhancedCandidates = enhancedCandidates;
		if (mergedConfig.useURIAnalysis) {
			consola.info("Étape 6 : Analyse des URI");
			uriEnhancedCandidates = analyzeURIs(enhancedCandidates);
		} else {
			consola.info(
				"Étape 6 : Analyse des URI ignorée (désactivée dans la configuration)",
			);
		}

		// Step 7: Extract types
		consola.info("Étape 7 : Extraction des types");
		const columnTypes = await extractTypesForAllColumns(uriEnhancedCandidates);

		// Step 8: Aggregate and vote on the final types
		consola.info("Étape 8 : Agrégation et vote sur les types finaux");
		const annotations = aggregateColumnTypes(
			columnTypes,
			cleanedTable.headers,
			columnRelations,
		);

		const duration = (Date.now() - startTime) / 1000;
		consola.success(
			`Annotation de type de colonne terminée en ${duration.toFixed(2)} secondes`,
		);

		return annotations;
	} catch (error) {
		consola.error(
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

		consola.success(`Annotations enregistrées dans ${outputPath}`);
	} catch (error) {
		consola.error(
			`Erreur lors de l'enregistrement des annotations : ${error instanceof Error ? error.message : String(error)}`,
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

		if (args.length < 1) {
			consola.error(
				"Utilisation : bun run src/index.ts <chemin-fichier-csv> [chemin-sortie]",
			);
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
		consola.info("Résumé des annotations :");
		for (const annotation of annotations) {
			consola.info(
				`Colonne "${annotation.columnHeader}" : ${annotation.assignedType.label} (${annotation.confidence.toFixed(2)})`,
			);
		}
	} catch (error) {
		consola.error(
			`Erreur : ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

main();
