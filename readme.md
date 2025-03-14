# Détecteur de Types pour Colonnes CSV

Ce projet permet d'analyser un fichier CSV et de détecter automatiquement les types sémantiques des colonnes en utilisant DBpedia et Wikidata comme sources de connaissances.

## Fonctionnalités

- Lecture et analyse de fichiers CSV
- Détection automatique des types de colonnes
- Utilisation de DBpedia et Wikidata comme sources de connaissances
- Calcul de scores de confiance pour chaque type détecté
- Sélection intelligente de la colonne la plus facile à classifier

## Installation

1. Clonez le dépôt
2. Installez les dépendances :
```bash
npm install
```

## Configuration

Le projet utilise les configurations suivantes par défaut :

- Endpoints SPARQL :
  - DBpedia : http://dbpedia.org/sparql
  - Wikidata : https://query.wikidata.org/sparql
- Paramètres de recherche :
  - Distance maximale : 5
  - Confiance minimale : 0.5
  - Nombre maximum de résultats : 10

## Structure du Projet

```
├── services/
│   ├── TypeDetectionService.ts    # Service principal de détection
│   ├── KnowledgeBaseService.ts    # Interface de base pour les sources de données
│   ├── DBpediaService.ts         # Service spécifique pour DBpedia
│   └── WikidataService.ts        # Service spécifique pour Wikidata
├── types.ts                      # Définitions des types TypeScript
└── main.ts                      # Point d'entrée de l'application
```

## Utilisation

```typescript
import { analyzeCSV } from './main';

// Analyse d'un fichier CSV
await analyzeCSV('chemin/vers/fichier.csv');
```

## Fonctionnement

1. **Lecture du CSV** :
   - Lecture du fichier CSV
   - Extraction des en-têtes de colonnes
   - Échantillonnage des valeurs (10 premières lignes par défaut)

2. **Analyse des Colonnes** :
   - Pour chaque colonne :
     - Analyse des valeurs échantillonnées
     - Recherche des types possibles dans DBpedia et Wikidata
     - Calcul des scores de confiance

3. **Sélection de la Meilleure Colonne** :
   - Comparaison des scores de confiance
   - Sélection de la colonne avec le score le plus élevé
