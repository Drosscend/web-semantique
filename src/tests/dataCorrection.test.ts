/**
 * Tests for the dataCorrection module
 *
 * This file contains tests for the standardizeCapitalization function
 * to ensure it correctly handles various text patterns.
 */

import { describe, expect, test } from "bun:test";
import {
	correctCellValue,
	correctCommonSpellingMistakes,
	standardizeCapitalization,
	standardizeDateFormat,
	standardizeNumberFormat,
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

describe("standardizeDateFormat", () => {
	// European date formats (day first)
	test("should standardize European date formats (day first)", () => {
		// DD/MM/YYYY format
		expect(standardizeDateFormat("31/12/2023")).toBe("2023-12-31");
		expect(standardizeDateFormat("01/12/2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("1/12/2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("31/1/2023")).toBe("2023-01-31");
		expect(standardizeDateFormat("1/1/2023")).toBe("2023-01-01");

		// DD.MM.YYYY format
		expect(standardizeDateFormat("31.12.2023")).toBe("2023-12-31");
		expect(standardizeDateFormat("01.12.2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("1.12.2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("31.1.2023")).toBe("2023-01-31");
		expect(standardizeDateFormat("1.1.2023")).toBe("2023-01-01");

		// DD-MM-YYYY format
		expect(standardizeDateFormat("31-12-2023")).toBe("2023-12-31");
		expect(standardizeDateFormat("01-12-2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("1-12-2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("31-1-2023")).toBe("2023-01-31");
		expect(standardizeDateFormat("1-1-2023")).toBe("2023-01-01");
	});

	// US date formats (month first)
	test("should standardize US date formats (month first)", () => {
		expect(standardizeDateFormat("12/31/2023")).toBe("2023-12-31");
		expect(standardizeDateFormat("12/01/2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("12/1/2023")).toBe("2023-12-01");
		expect(standardizeDateFormat("1/31/2023")).toBe("2023-01-31");
		expect(standardizeDateFormat("1/1/2023")).toBe("2023-01-01");
	});

	// Short year formats
	test("should handle 2-digit years correctly", () => {
		// European format with 2-digit year
		expect(standardizeDateFormat("31/12/23")).toBe("2023-12-31");
		expect(standardizeDateFormat("01/01/90")).toBe("1990-01-01"); // 20th century
		expect(standardizeDateFormat("01/01/30")).toBe("2030-01-01"); // 21st century

		// US format with 2-digit year
		expect(standardizeDateFormat("12/31/23")).toBe("2023-12-31");
		expect(standardizeDateFormat("01/01/90")).toBe("1990-01-01"); // 20th century
		expect(standardizeDateFormat("01/01/30")).toBe("2030-01-01"); // 21st century
	});

	// ISO and other formats
	test("should handle ISO and other common formats", () => {
		// ISO format (should remain unchanged)
		expect(standardizeDateFormat("2023-12-31")).toBe("2023-12-31");
		expect(standardizeDateFormat("2023-01-01")).toBe("2023-01-01");

		// Other formats
		expect(standardizeDateFormat("2023/12/31")).toBe("2023-12-31");
		expect(standardizeDateFormat("2023.12.31")).toBe("2023-12-31");
	});

	// Edge cases
	test("should handle edge cases appropriately", () => {
		// Non-date values should be returned unchanged
		expect(standardizeDateFormat("not a date")).toBe("not a date");
		expect(standardizeDateFormat("")).toBe("");
		expect(standardizeDateFormat("12345")).toBe("12345"); // Too short to be a date

		// Invalid dates should be returned unchanged
		expect(standardizeDateFormat("32/12/2023")).toBe("32/12/2023"); // Invalid day
		expect(standardizeDateFormat("31/13/2023")).toBe("31/13/2023"); // Invalid month

		// Dates with time components
		expect(standardizeDateFormat("2023-12-31 12:34:56")).toBe(
			"2023-12-31 12:34:56",
		); // Not handled by our function
	});
});

describe("standardizeNumberFormat", () => {
	// Basic number formats
	test("should handle basic number formats", () => {
		expect(standardizeNumberFormat("123")).toBe("123");
		expect(standardizeNumberFormat("123.45")).toBe("123.45");
		expect(standardizeNumberFormat("123,45")).toBe("123.45");
		expect(standardizeNumberFormat("0.5")).toBe("0.5");
		expect(standardizeNumberFormat("0,5")).toBe("0.5");
	});

	// Negative numbers
	test("should handle negative numbers", () => {
		expect(standardizeNumberFormat("-123")).toBe("-123");
		expect(standardizeNumberFormat("-123.45")).toBe("-123.45");
		expect(standardizeNumberFormat("-123,45")).toBe("-123.45");
		expect(standardizeNumberFormat("−123.45")).toBe("−123.45"); // Unicode minus sign
	});

	// Numbers with spaces
	test("should handle numbers with spaces", () => {
		expect(standardizeNumberFormat("1 234.56")).toBe("1234.56");
		expect(standardizeNumberFormat("1 234,56")).toBe("1234.56");
		expect(standardizeNumberFormat("1 234 567.89")).toBe("1234567.89");
		expect(standardizeNumberFormat("1 234 567,89")).toBe("1234567.89");
	});

	// International formats
	test("should handle international number formats", () => {
		// European format (comma as decimal, dot as thousand separator)
		expect(standardizeNumberFormat("1.234,56")).toBe("1234.56");
		expect(standardizeNumberFormat("1.234.567,89")).toBe("1234567.89");

		// US/UK format (dot as decimal, comma as thousand separator)
		expect(standardizeNumberFormat("1,234.56")).toBe("1234.56");
		expect(standardizeNumberFormat("1,234,567.89")).toBe("1234567.89");

		// Indian format (comma as thousand separator, dot as decimal)
		expect(standardizeNumberFormat("12,34,567.89")).toBe("1234567.89");
	});

	// Multiple separators
	test("should handle numbers with multiple separators", () => {
		// Mixed separators
		expect(standardizeNumberFormat("1.234,567.89")).toBe("1234567.89");
		expect(standardizeNumberFormat("1,234.567,89")).toBe("1234567.89");

		// All dots
		expect(standardizeNumberFormat("1.234.567.89")).toBe("1234567.89");

		// All commas
		expect(standardizeNumberFormat("1,234,567,89")).toBe("1234567.89");
	});

	// Edge cases
	test("should handle edge cases appropriately", () => {
		// Empty or invalid values
		expect(standardizeNumberFormat("")).toBe("");
		expect(standardizeNumberFormat(" ")).toBe(" ");
		expect(standardizeNumberFormat("abc")).toBe("abc");
		expect(standardizeNumberFormat("123abc")).toBe("123abc");

		// Numbers with leading/trailing separators
		expect(standardizeNumberFormat(".5")).toBe(".5");
		expect(standardizeNumberFormat("5.")).toBe("5.");
		expect(standardizeNumberFormat(",5")).toBe(",5");
		expect(standardizeNumberFormat("5,")).toBe("5,");

		// Very large numbers
		expect(standardizeNumberFormat("1,234,567,890.12")).toBe("1234567890.12");
		expect(standardizeNumberFormat("1.234.567.890,12")).toBe("1234567890.12");
	});

	// Scientific notation
	test("should handle scientific notation", () => {
		expect(standardizeNumberFormat("1.23e4")).toBe("1.23e4");
		expect(standardizeNumberFormat("1,23e4")).toBe("1.23e4");
		expect(standardizeNumberFormat("1.23E-4")).toBe("1.23E-4");
		expect(standardizeNumberFormat("1,23E-4")).toBe("1.23E-4");
	});
});

describe("correctCommonSpellingMistakes", () => {
	// Common spelling mistakes
	test("should correct common spelling mistakes", () => {
		expect(correctCommonSpellingMistakes("accomodate")).toBe("accommodate");
		expect(correctCommonSpellingMistakes("alot of things")).toBe(
			"a lot of things",
		);
		expect(correctCommonSpellingMistakes("at the begining")).toBe(
			"at the beginning",
		);
		expect(correctCommonSpellingMistakes("I beleive you")).toBe(
			"I believe you",
		);
		expect(correctCommonSpellingMistakes("check your calender")).toBe(
			"check your calendar",
		);
		expect(correctCommonSpellingMistakes("definately correct")).toBe(
			"definitely correct",
		);
		expect(correctCommonSpellingMistakes("don't embarass me")).toBe(
			"don't embarrass me",
		);
		expect(correctCommonSpellingMistakes("proof of existance")).toBe(
			"proof of existence",
		);
		expect(correctCommonSpellingMistakes("bad grammer")).toBe("bad grammar");
		expect(correctCommonSpellingMistakes("workplace harrassment")).toBe(
			"workplace harassment",
		);
		expect(correctCommonSpellingMistakes("independant research")).toBe(
			"independent research",
		);
		expect(correctCommonSpellingMistakes("liason officer")).toBe(
			"liaison officer",
		);
		expect(correctCommonSpellingMistakes("new millenium")).toBe(
			"new millennium",
		);
		expect(correctCommonSpellingMistakes("neccessary steps")).toBe(
			"necessary steps",
		);
		expect(correctCommonSpellingMistakes("special occassion")).toBe(
			"special occasion",
		);
		expect(correctCommonSpellingMistakes("it occured yesterday")).toBe(
			"it occurred yesterday",
		);
		expect(correctCommonSpellingMistakes("in posession of")).toBe(
			"in possession of",
		);
		expect(correctCommonSpellingMistakes("recieve a gift")).toBe(
			"receive a gift",
		);
		expect(correctCommonSpellingMistakes("seperate issues")).toBe(
			"separate issues",
		);
		expect(correctCommonSpellingMistakes("succesful project")).toBe(
			"successful project",
		);
		expect(correctCommonSpellingMistakes("wait untill tomorrow")).toBe(
			"wait until tomorrow",
		);
		expect(correctCommonSpellingMistakes("that's wierd")).toBe("that's weird");
	});

	// Case insensitivity
	test("should handle case insensitivity", () => {
		expect(correctCommonSpellingMistakes("Accomodate")).toBe("Accommodate");
		expect(correctCommonSpellingMistakes("ALOT")).toBe("A LOT");
		expect(correctCommonSpellingMistakes("Beleive")).toBe("Believe");
		expect(correctCommonSpellingMistakes("DEFINATELY")).toBe("DEFINITELY");
	});

	// Mixed text with spelling mistakes
	test("should correct spelling mistakes in mixed text", () => {
		expect(
			correctCommonSpellingMistakes(
				"I will definately recieve it untill tomorrow",
			),
		).toBe("I will definitely receive it until tomorrow");
		expect(
			correctCommonSpellingMistakes(
				"This is a seperate occassion that occured",
			),
		).toBe("This is a separate occasion that occurred");
	});

	// Words that don't need correction
	test("should leave correct words unchanged", () => {
		expect(correctCommonSpellingMistakes("accommodate")).toBe("accommodate");
		expect(correctCommonSpellingMistakes("a lot")).toBe("a lot");
		expect(correctCommonSpellingMistakes("beginning")).toBe("beginning");
		expect(correctCommonSpellingMistakes("This is correct text")).toBe(
			"This is correct text",
		);
	});

	// Empty string and non-matching text
	test("should handle empty strings and non-matching text", () => {
		expect(correctCommonSpellingMistakes("")).toBe("");
		expect(correctCommonSpellingMistakes("No spelling mistakes here")).toBe(
			"No spelling mistakes here",
		);
		expect(correctCommonSpellingMistakes("12345")).toBe("12345");
	});
});
