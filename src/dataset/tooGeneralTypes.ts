/**
 * Too General Types Dataset
 *
 * This file contains the list of type URIs considered too general to be useful for semantic annotation.
 * You can extend this list by adding new URIs as needed.
 *
 * Usage:
 *   - Import TOO_GENERAL_TYPES wherever you need to filter out overly broad types in the pipeline.
 */

export const TOO_GENERAL_TYPES: string[] = [
  // OWL/Schema top-level
  "http://www.w3.org/2002/07/owl#Thing",
  "http://schema.org/Thing",

  // DBpedia top-level types
  "http://dbpedia.org/ontology/Thing",
  "http://dbpedia.org/ontology/Agent",
  "http://dbpedia.org/ontology/Place",
  "http://dbpedia.org/ontology/TopicalConcept",
  "http://dbpedia.org/ontology/Event",
  "http://dbpedia.org/ontology/Work",
  "http://dbpedia.org/ontology/Species",
  "http://dbpedia.org/ontology/TimePeriod",
  "http://dbpedia.org/ontology/MeanOfTransportation",
  "http://dbpedia.org/ontology/PersonFunction",

  // DBpedia number types
  "http://dbpedia.org/ontology/Number",
  "http://dbpedia.org/ontology/Integer",
  "http://dbpedia.org/ontology/Decimal",
  "http://dbpedia.org/ontology/Float",

  // Wikidata top-level types
  "http://www.wikidata.org/entity/Q35120", // Entity
  "http://www.wikidata.org/entity/Q488383", // Object
  "http://www.wikidata.org/entity/Q7184903", // Abstract object
  "http://www.wikidata.org/entity/Q830077", // Subject
  "http://www.wikidata.org/entity/Q35120", // Entity
  "http://www.wikidata.org/entity/Q1190554", // Occurrence
  "http://www.wikidata.org/entity/Q186081", // Time interval
  "http://www.wikidata.org/entity/Q5", // Human
  "http://www.wikidata.org/entity/Q795052", // Information entity
  "http://www.wikidata.org/entity/Q4406616", // Structure
  "http://www.wikidata.org/entity/Q618123", // Geographic feature
  "http://www.wikidata.org/entity/Q2221906", // Geographic location
  "http://www.wikidata.org/entity/Q43229", // Organization
  "http://www.wikidata.org/entity/Q7725634", // Literary work
  "http://www.wikidata.org/entity/Q386724", // Work
  "http://www.wikidata.org/entity/Q1656682", // Event

  // Wikidata number types
  "http://www.wikidata.org/entity/Q12503", // number
  "http://www.wikidata.org/entity/Q28920044", // numeric value
  "http://www.wikidata.org/entity/Q199", // integer
  "http://www.wikidata.org/entity/Q1413235", // decimal number
  "http://www.wikidata.org/entity/Q11563", // floating point number
]; 