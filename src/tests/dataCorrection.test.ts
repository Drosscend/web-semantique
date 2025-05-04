/**
 * Tests for the dataCorrection module
 *
 * This file contains tests for the standardizeCapitalization function
 * to ensure it correctly handles various text patterns.
 */

import { describe, expect, test } from "bun:test";
import {
	correctCellValue,
	standardizeCapitalization,
} from "../modules/dataCorrection";

describe("standardizeCapitalization", () => {
	// Acronyms (should be preserved)
	test("should preserve acronyms", () => {
		expect(standardizeCapitalization("NASA")).toBe("NASA");
		expect(standardizeCapitalization("IBM")).toBe("IBM");
	});

	// Numbers and dates (should be preserved)
	test("should preserve numbers and dates", () => {
		expect(standardizeCapitalization("123.45")).toBe("123.45");
		expect(standardizeCapitalization("12/05/2023")).toBe("12/05/2023");
	});

	// Single proper nouns (should be Title Case)
	test("should convert single proper nouns to Title Case", () => {
		expect(standardizeCapitalization("john")).toBe("John");
		expect(standardizeCapitalization("PARIS")).toBe("PARIS"); // This is all caps, so preserved as acronym
		expect(standardizeCapitalization("france")).toBe("France");
	});

	// Multi-word titles (should be Title Case with small words lowercase)
	test("should convert multi-word titles to Title Case with small words lowercase", () => {
		expect(standardizeCapitalization("the lord of the rings")).toBe(
			"The Lord of the Rings",
		);
		expect(standardizeCapitalization("a tale of two cities")).toBe(
			"A Tale of Two Cities",
		);
		expect(standardizeCapitalization("jean de la fontaine")).toBe(
			"Jean de la Fontaine",
		);
	});

	// Sentences (should be Sentence case)
	test("should convert sentences to Sentence case", () => {
		expect(
			standardizeCapitalization(
				"this is a sentence. this is another sentence.",
			),
		).toBe("This is a sentence. This is another sentence.");
		expect(standardizeCapitalization("hello world! how are you?")).toBe(
			"Hello world! How are you?",
		);
	});

	// Mixed text
	test("should handle mixed text appropriately", () => {
		expect(standardizeCapitalization("john DOE from NEW york")).toBe(
			"John Doe from New York",
		);
		expect(standardizeCapitalization("product_id: 12345")).toBe(
			"Product_id: 12345",
		);
	});
});

describe("correctCellValue", () => {
	// Acronyms (should be preserved)
	test("should preserve acronyms", () => {
		expect(correctCellValue("NASA")).toBe("NASA");
		expect(correctCellValue("IBM")).toBe("IBM");
	});

	// Numbers and dates
	test("should preserve numbers and standardize dates to ISO format", () => {
		expect(correctCellValue("123.45")).toBe("123.45");
		expect(correctCellValue("12/05/2023")).toBe("2023-05-12"); // Expect ISO format (YYYY-MM-DD)
	});

	// Single proper nouns (should be Title Case)
	test("should convert single proper nouns to Title Case", () => {
		expect(correctCellValue("john")).toBe("John");
		expect(correctCellValue("PARIS")).toBe("PARIS"); // This is all caps, so preserved as acronym
		expect(correctCellValue("france")).toBe("France");
	});

	// Multi-word titles (should be Title Case with small words lowercase)
	test("should convert multi-word titles to Title Case with small words lowercase", () => {
		expect(correctCellValue("the lord of the rings")).toBe(
			"The Lord of the Rings",
		);
		expect(correctCellValue("a tale of two cities")).toBe(
			"A Tale of Two Cities",
		);
		expect(correctCellValue("jean de la fontaine")).toBe("Jean de la Fontaine");
	});

	// Sentences (should be Sentence case)
	test("should convert sentences to Sentence case", () => {
		expect(
			correctCellValue("this is a sentence. this is another sentence."),
		).toBe("This is a sentence. This is another sentence.");
		expect(correctCellValue("hello world! how are you?")).toBe(
			"Hello world! How are you?",
		);
	});

	// Mixed text
	test("should handle mixed text appropriately", () => {
		expect(correctCellValue("john DOE from NEW york")).toBe(
			"John Doe from New York",
		);
		expect(correctCellValue("product_id: 12345")).toBe("Product_id: 12345");
	});
});
