import { DBpediaService } from './DBpediaService';
import { WikidataService } from './WikidataService';
import type { TypeDetectionResult, APIConfig } from '../types';

export class TypeDetectionService {
    private dbpediaService: DBpediaService;
    private wikidataService: WikidataService;

    constructor(config: APIConfig) {
        this.dbpediaService = new DBpediaService(config);
        this.wikidataService = new WikidataService(config);
    }

    async detectType(sampleValues: string[]): Promise<TypeDetectionResult[]> {
        const results: TypeDetectionResult[] = [];

        // Try DBpedia first
        try {
            const dbpediaResult = await this.dbpediaService.detectType(sampleValues);
            if (dbpediaResult) {
                results.push(dbpediaResult);
            }
        } catch (error) {
            console.error('DBpedia detection failed:', error);
        }

        // Try Wikidata as fallback
        try {
            const wikidataResult = await this.wikidataService.detectType(sampleValues);
            if (wikidataResult) {
                results.push(wikidataResult);
            }
        } catch (error) {
            console.error('Wikidata detection failed:', error);
        }

        return results;
    }
} 