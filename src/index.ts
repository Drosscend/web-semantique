/**
 * CSV to RDF Column Type Annotation (CTA) Main Entry Point
 *
 * This is the main entry point for the CTA algorithm, which has been restructured into:
 * 1. cta.ts - Core CTA functionality
 * 2. cli.ts - CLI and interactive menu functionality
 *
 * This file simply imports and calls the main function from cli.ts.
 */

import { main } from "./cli";

// Call the main function to start the application
main();
