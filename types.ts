export interface CSVColumn {
    name: string;
    index: number;
    sampleValues: string[];
}

export interface SearchParameters {
    maxDistance: number;
    minConfidence: number;
    maxResults: number;
}

export interface APIConfig {
    dbpediaEndpoint: string;
    wikidataEndpoint: string;
    timeout: number;
}

export interface TypeDetectionResult {
    type: string;
    confidence: number;
    source: 'dbpedia' | 'wikidata';
} 