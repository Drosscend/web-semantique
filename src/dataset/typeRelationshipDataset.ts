/**
 * Type Relationship Dataset
 *
 * This file contains the known semantic relationships between entity types (DBpedia and Wikidata) used for column relationship analysis.
 *
 * Structure:
 *   - Each relationship links a source type to a target type, with a relation name and a confidence score.
 *   - You can extend this dataset by adding new objects to the array, following the same structure.
 *
 * Usage:
 *   - Import KNOWN_TYPE_RELATIONSHIPS wherever you need to access type relationships in the annotation pipeline.
 *   - This dataset is used by the ColumnRelationshipService to infer semantic links between columns.
 *
 * Example extension:
 *   {
 *     sourceType: "http://dbpedia.org/ontology/YourSourceType",
 *     targetType: "http://www.wikidata.org/entity/QXXXX",
 *     relationName: "yourRelation",
 *     confidence: 0.8
 *   }
 */
export interface TypeRelationship {
    sourceType: string;
    targetType: string;
    relationName: string;
    confidence: number;
  }
  
  export const KNOWN_TYPE_RELATIONSHIPS: TypeRelationship[] = [
    // Country - Capital relationships
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/City",
      relationName: "hasCapital",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q5119", // Capital
      relationName: "hasCapital",
      confidence: 0.9,
    },
  
    // Country - City relationships
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/City",
      relationName: "hasCity",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q515", // City
      relationName: "hasCity",
      confidence: 0.7,
    },
  
    // Administrative/Geographic hierarchies
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/Region",
      relationName: "hasRegion",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q82794", // Region
      relationName: "hasRegion",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Region",
      targetType: "http://dbpedia.org/ontology/City",
      relationName: "hasCity",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q82794", // Region
      targetType: "http://www.wikidata.org/entity/Q515", // City
      relationName: "hasCity",
      confidence: 0.8,
    },
  
    // Country - Natural features
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/Mountain",
      relationName: "hasMountain",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q8502", // Mountain
      relationName: "hasMountain",
      confidence: 0.7,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/River",
      relationName: "hasRiver",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q4022", // River
      relationName: "hasRiver",
      confidence: 0.7,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/Lake",
      relationName: "hasLake",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q23397", // Lake
      relationName: "hasLake",
      confidence: 0.7,
    },
  
    // Country - Infrastructure
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/Airport",
      relationName: "hasAirport",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q1248784", // Airport
      relationName: "hasAirport",
      confidence: 0.8,
    },
  
    // Organization - Person relations
    {
      sourceType: "http://dbpedia.org/ontology/Organisation",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "foundedBy",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q43229", // Organization
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "foundedBy",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Organisation",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasMember",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q43229", // Organization
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasMember",
      confidence: 0.7,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Company",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasCEO",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q783794", // Company
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasCEO",
      confidence: 0.8,
    },
  
    // Educational institutions - Person
    {
      sourceType: "http://dbpedia.org/ontology/University",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasAlumnus",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q3918", // University
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasAlumnus",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/University",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasProfessor",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q3918", // University
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasProfessor",
      confidence: 0.8,
    },
  
    // Nouvelles relations auteur-œuvre
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Book",
      relationName: "isAuthorOf",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q571", // Book
      relationName: "isAuthorOf",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Film",
      relationName: "isDirectorOf",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q11424", // Film
      relationName: "isDirectorOf",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/MusicalWork",
      relationName: "isComposerOf",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q2188189", // MusicalWork
      relationName: "isComposerOf",
      confidence: 0.9,
    },
  
    // Relations liées aux sports
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Sport",
      relationName: "practicesSport",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q349", // Sport
      relationName: "practicesSport",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/SportsTeam",
      relationName: "memberOfSportsTeam",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q12973014", // SportsTeam
      relationName: "memberOfSportsTeam",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/SportsTeam",
      targetType: "http://dbpedia.org/ontology/SportingEvent",
      relationName: "participatesIn",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q12973014", // SportsTeam
      targetType: "http://www.wikidata.org/entity/Q16510064", // SportingEvent
      relationName: "participatesIn",
      confidence: 0.8,
    },
  
    // Relations technologiques
    {
      sourceType: "http://dbpedia.org/ontology/Company",
      targetType: "http://dbpedia.org/ontology/Device",
      relationName: "manufactures",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q783794", // Company
      targetType: "http://www.wikidata.org/entity/Q3966", // ComputerHardware
      relationName: "manufactures",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Company",
      targetType: "http://dbpedia.org/ontology/Software",
      relationName: "develops",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q783794", // Company
      targetType: "http://www.wikidata.org/entity/Q7397", // Software
      relationName: "develops",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Software",
      targetType: "http://dbpedia.org/ontology/ComputerHardware",
      relationName: "runsOn",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q7397", // Software
      targetType: "http://www.wikidata.org/entity/Q3966", // ComputerHardware
      relationName: "runsOn",
      confidence: 0.8,
    },
  
    // Relations alimentaires
    {
      sourceType: "http://dbpedia.org/ontology/Food",
      targetType: "http://dbpedia.org/ontology/FoodIngredient",
      relationName: "hasIngredient",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q2095", // Food
      targetType: "http://www.wikidata.org/entity/Q25403900", // FoodIngredient
      relationName: "hasIngredient",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/Food",
      relationName: "hasTraditionalFood",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q2095", // Food
      relationName: "hasTraditionalFood",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Company",
      targetType: "http://dbpedia.org/ontology/Food",
      relationName: "produces",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q783794", // Company
      targetType: "http://www.wikidata.org/entity/Q2095", // Food
      relationName: "produces",
      confidence: 0.8,
    },
  
    // Relations véhicule-fabricant
    {
      sourceType: "http://dbpedia.org/ontology/Company",
      targetType: "http://dbpedia.org/ontology/Automobile",
      relationName: "manufactures",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q783794", // Company
      targetType: "http://www.wikidata.org/entity/Q1420", // Automobile
      relationName: "manufactures",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Automobile",
      targetType: "http://dbpedia.org/ontology/Company",
      relationName: "manufacturedBy",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q1420", // Automobile
      targetType: "http://www.wikidata.org/entity/Q783794", // Company
      relationName: "manufacturedBy",
      confidence: 0.9,
    },
  
    // Relations familiales
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasParent",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasParent",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasChild",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasChild",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasSibling",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasSibling",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/Person",
      relationName: "hasSpouse",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q5", // Human
      relationName: "hasSpouse",
      confidence: 0.9,
    },
  
    // Relations médicales
    {
      sourceType: "http://dbpedia.org/ontology/Disease",
      targetType: "http://dbpedia.org/ontology/Disease",
      relationName: "hasSymptom",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q12136", // Disease
      targetType: "http://www.wikidata.org/entity/Q169872", // Symptom
      relationName: "hasSymptom",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Drug",
      targetType: "http://dbpedia.org/ontology/Disease",
      relationName: "treats",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q12140", // Medication
      targetType: "http://www.wikidata.org/entity/Q12136", // Disease
      relationName: "treats",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Disease",
      targetType: "http://dbpedia.org/ontology/Organ",
      relationName: "affects",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q12136", // Disease
      targetType: "http://www.wikidata.org/entity/Q712378", // Organ
      relationName: "affects",
      confidence: 0.8,
    },
  
    // Relations géographiques supplémentaires
    {
      sourceType: "http://dbpedia.org/ontology/Country",
      targetType: "http://dbpedia.org/ontology/Country",
      relationName: "sharesBorderWith",
      confidence: 0.9,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q6256", // Country
      targetType: "http://www.wikidata.org/entity/Q6256", // Country
      relationName: "sharesBorderWith",
      confidence: 0.9,
    },
    {
      sourceType: "http://dbpedia.org/ontology/City",
      targetType: "http://dbpedia.org/ontology/River",
      relationName: "locatedOnRiver",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q515", // City
      targetType: "http://www.wikidata.org/entity/Q4022", // River
      relationName: "locatedOnRiver",
      confidence: 0.8,
    },
  
    // Relations éducatives
    {
      sourceType: "http://dbpedia.org/ontology/University",
      targetType: "http://dbpedia.org/ontology/AcademicSubject",
      relationName: "offers",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q3918", // University
      targetType: "http://www.wikidata.org/entity/Q11862829", // Academic discipline
      relationName: "offers",
      confidence: 0.8,
    },
    {
      sourceType: "http://dbpedia.org/ontology/Person",
      targetType: "http://dbpedia.org/ontology/AcademicSubject",
      relationName: "specializedIn",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q5", // Human
      targetType: "http://www.wikidata.org/entity/Q11862829", // Academic discipline
      relationName: "specializedIn",
      confidence: 0.7,
    },
  
    // Relations culturelles et artistiques
    {
      sourceType: "http://dbpedia.org/ontology/Artist",
      targetType: "http://dbpedia.org/ontology/Artist",
      relationName: "influencedBy",
      confidence: 0.7,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q483501", // Artist
      targetType: "http://www.wikidata.org/entity/Q483501", // Artist
      relationName: "influencedBy",
      confidence: 0.7,
    },
    {
      sourceType: "http://dbpedia.org/ontology/MusicalWork",
      targetType: "http://dbpedia.org/ontology/MusicGenre",
      relationName: "belongsToGenre",
      confidence: 0.8,
    },
    {
      sourceType: "http://www.wikidata.org/entity/Q2188189", // Musical work
      targetType: "http://www.wikidata.org/entity/Q188451", // Music genre
      relationName: "belongsToGenre",
      confidence: 0.8,
    }
  ]; 