/**
 * Utility functions for services
 *
 * This file contains common utility functions used by various services:
 * 1. queryWithRetries - For handling API requests with retry logic
 * 2. calculateStringSimilarity - For calculating similarity between strings
 */

import { consola } from "consola";

/**
 * Configuration for query retries
 */
export interface RetryConfig {
	maxRetries: number;
	retryDelay: number;
	timeout: number;
}

/**
 * Executes a query with retries
 * @param queryFn The query function to execute
 * @param config Retry configuration
 * @returns Promise resolving to the query response
 */
export async function queryWithRetries(
	queryFn: () => Promise<Response>,
	config: RetryConfig,
): Promise<Response> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
		try {
			return await Promise.race([
				queryFn(),
				new Promise<Response>((_, reject) => {
					setTimeout(
						() => reject(new Error("Request timeout")),
						config.timeout,
					);
				}),
			]);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			consola.warn(
				`Tentative de requête ${attempt} échouée : ${lastError.message}`,
			);

			if (attempt < config.maxRetries) {
				const delay = config.retryDelay * attempt;
				consola.debug(`Nouvelle tentative dans ${delay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError || new Error("Query failed after retries");
}

/**
 * Calculates the similarity between two strings
 * @param a First string
 * @param b Second string
 * @returns A similarity score between 0 and 1
 */
export function calculateStringSimilarity(a: string, b: string): number {
	if (a === b) return 1;
	if (a.length === 0 || b.length === 0) return 0;

	// Simple Jaccard similarity for demonstration
	const setA = new Set(a.split(""));
	const setB = new Set(b.split(""));

	const intersection = new Set([...setA].filter((x) => setB.has(x)));
	const union = new Set([...setA, ...setB]);

	return intersection.size / union.size;
}
