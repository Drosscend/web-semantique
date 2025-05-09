/**
 * Core CEA (Cell Entity Annotation) functionality
 *
 * Ce module extrait les entités pour chaque cellule d'un fichier CSV et prépare les résultats au format :
 * nom_fichier,ligne,colonne,uri
 */

import { DEFAULT_CTA_CONFIG } from "./config";
import { logger } from "./logger";
import type { Config } from "./types";

import { correctCells } from "./modules/dataCorrection";
import { extractCells, loadCSV } from "./modules/dataPreparation";
import { searchEntities } from "./modules/entitySearch";

/**
 * Runs the Cell Entity Annotation (CEA) algorithm on a CSV file
 * @param csvFilePath Path to the CSV file
 * @param config Optional configuration
 * @returns Promise resolving to an array of entity annotations: { row, column, uri }
 */
export async function runCEA(
  csvFilePath: string,
  config: Partial<Config> = {},
): Promise<{ row: number; column: number; uri: string, confidence: number }[]> {
  const startTime = Date.now();
  const mergedConfig: Config = { ...DEFAULT_CTA_CONFIG, ...config };

  try {
    logger.info(`Démarrage de l'annotation d'entités pour ${csvFilePath}`);
    logger.info("Configuration :", mergedConfig);

    // Step 1: Load and prepare the CSV data
    logger.info("Étape 1 : Chargement et préparation des données CSV");
    const csvTable = await loadCSV(csvFilePath);
    // Forcer le sampleSize à la taille du fichier pour CEA
    mergedConfig.sampleSize = csvTable.data.length;
    const columnCells = extractCells(csvTable, mergedConfig);

    // Step 2: Correct the data
    logger.info("Étape 2 : Correction des données");
    const correctedCells = correctCells(columnCells);

    // Step 3: Search for entities
    logger.info("Étape 3 : Recherche d'entités");
    const entityCandidates = await searchEntities(correctedCells, mergedConfig);

    // Prepare results: for each cell, output row, column, and the best entity URI (if any)
    const results: { row: number; column: number; uri: string, confidence: number }[] = [];
    for (let col = 0; col < entityCandidates.length; col++) {
      for (const candidate of entityCandidates[col]) {
        if (candidate?.entity?.uri) {
          results.push({
            row: candidate.cell.rowIndex,
            column: candidate.cell.columnIndex,
            uri: candidate.entity.uri,
            confidence: candidate.entity.confidence,
          });
        }
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    logger.info(
      `Annotation d'entités terminée en ${duration.toFixed(2)} secondes`,
    );

    return results;
  } catch (error) {
    logger.error(
      `Erreur lors de l'exécution de CEA : ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}