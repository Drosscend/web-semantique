import { parse } from 'csv-parse';
import { consola } from 'consola';
import { TypeDetectionService } from './services/TypeDetectionService';
import { DBpediaService } from './services/DBpediaService';
import { WikidataService } from './services/WikidataService';
import type { CSVColumn, SearchParameters, APIConfig } from './types';

/**
 * Configuration par défaut pour les APIs
 */
const defaultConfig: APIConfig = {
    dbpediaEndpoint: 'http://dbpedia.org/sparql',
    wikidataEndpoint: 'https://query.wikidata.org/sparql',
    timeout: 30000
};

/**
 * Paramètres de recherche par défaut
 */
const defaultSearchParams: SearchParameters = {
    maxDistance: 5,
    minConfidence: 0.5,
    maxResults: 10
};

/**
 * Lit un fichier CSV et extrait les colonnes avec des échantillons de valeurs
 * @param filePath Chemin du fichier CSV
 * @param sampleSize Nombre de lignes à échantillonner
 * @returns Liste des colonnes avec leurs échantillons
 */
async function readCSVColumns(filePath: string, sampleSize: number = 10): Promise<CSVColumn[]> {
    try {
        const file = Bun.file(filePath);
        const text = await file.text();
        
        return new Promise((resolve, reject) => {
            const columns: CSVColumn[] = [];
            let headers: string[] = [];
            let sampleValues: string[][] = [];
            let rowCount = 0;

            const parser = parse(text, {
                delimiter: ',',
                columns: false,
                skip_empty_lines: true,
                trim: true
            });

            parser.on('data', (row: string[]) => {
                if (rowCount === 0) {
                    headers = row.map((_, index) => `col${index}`);
                    sampleValues = headers.map(() => []);
                }

                if (rowCount < sampleSize) {
                    row.forEach((value, index) => {
                        sampleValues[index].push(value);
                    });
                    rowCount++;
                }
            });

            parser.on('end', () => {
                columns.push(...headers.map((name, index) => ({
                    name,
                    index,
                    sampleValues: sampleValues[index]
                })));
                resolve(columns);
            });

            parser.on('error', (error) => {
                consola.error('Erreur de parsing:', error);
                reject(error);
            });
        });
    } catch (error) {
        consola.error('Erreur lors de la lecture du fichier:', error);
        throw error;
    }
}

/**
 * Trouve la colonne la plus facile à classifier
 * @param columns Liste des colonnes
 * @param typeDetectionService Service de détection des types
 * @returns La colonne la plus facile à classifier
 */
async function findEasiestColumn(
    columns: CSVColumn[],
    typeDetectionService: TypeDetectionService
): Promise<CSVColumn | null> {
    consola.info('Veuillez choisir la colonne la plus appropriée pour la classification :');
    
    // Afficher les colonnes avec leurs échantillons
    columns.forEach((col, index) => {
        consola.log(`${index + 1}. ${col.name}`);
        consola.log(`   Échantillons: ${col.sampleValues.slice(0, 3).join(', ')}${col.sampleValues.length > 3 ? '...' : ''}`);
    });

    // Demander à l'utilisateur de choisir une colonne
    const selectedIndex = await consola.prompt('Numéro de la colonne (1-' + columns.length + '):', {
        type: 'text',
        validate: (input: string) => {
            const num = parseInt(input);
            if (isNaN(num) || num < 1 || num > columns.length) {
                return 'Veuillez entrer un numéro valide';
            }
            return true;
        }
    });

    const index = parseInt(selectedIndex) - 1;
    return columns[index];
}

/**
 * Point d'entrée principal du programme
 * @param filePath Chemin du fichier CSV
 */
export async function analyzeCSV(filePath: string): Promise<void> {
    consola.info("CSV type detection using DBpedia and Wikidata");
    consola.info("---------------------------------------------");
    consola.info("This program will help you detect the type of each column in a CSV file using DBpedia and Wikidata.");
    consola.info("By Kévin Véronési and Noémie Tandol");
    consola.info("---------------------------------------------");
    try {
        // Initialize services
        const typeDetectionService = new TypeDetectionService(defaultConfig);

        // Read CSV columns
        const columns = await readCSVColumns(filePath);
        consola.success('Colonnes trouvées:', columns.map(col => col.name));

        // Find the easiest column to classify
        const bestColumn = await findEasiestColumn(columns, typeDetectionService);
        
        if (bestColumn) {
            consola.success('Colonne sélectionnée pour la classification:', bestColumn.name);
            consola.info('Échantillons:', bestColumn.sampleValues);
            
            // Detect type for the best column
            const typeResults = await typeDetectionService.detectType(bestColumn.sampleValues);
            consola.info('Résultats de détection de type:', typeResults);
        } else {
            consola.warn('Aucune colonne appropriée trouvée pour la classification');
        }
    } catch (error) {
        consola.error('Erreur lors de l\'analyse du CSV:', error);
        throw error;
    }
}
