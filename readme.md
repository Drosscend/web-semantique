# Annotation de Type de Colonne CSV vers RDF (CTA)

Ce projet implémente un algorithme d'Annotation de Type de Colonne (CTA) qui détermine automatiquement le type sémantique de chaque colonne dans un fichier CSV en utilisant les bases de connaissances Wikidata et DBpedia.

## Vue d'ensemble

L'algorithme CTA fonctionne en plusieurs étapes détaillées ci-dessous :

1. **Préparation et nettoyage des données** : 
   - Chargement du fichier CSV dans une structure de données tabulaire
   - Suppression des espaces superflus en début et fin de chaîne
   - Normalisation des caractères spéciaux (accents, diacritiques)
   - Extraction des cellules pour chaque colonne avec échantillonnage configurable
   - Création d'une structure de données optimisée pour le traitement

2. **Correction des données** :
   - Normalisation des valeurs (majuscules en début de mot, suppression des caractères spéciaux)
   - Correction orthographique basique pour les erreurs courantes
   - Standardisation des formats pour améliorer la correspondance d'entités
   - Préparation des données pour la recherche d'entités

3. **Recherche d'entités** :
   - Recherche d'entités correspondantes dans Wikidata via son API
   - Identification de plusieurs candidats potentiels pour chaque valeur de cellule
   - Attribution de scores de confiance basés sur la qualité de la correspondance
   - Création d'une liste d'entités candidates pour chaque cellule avec leurs métadonnées

4. **Correspondance entre types** :
   - Application de mappings entre les types équivalents de DBpedia et Wikidata
   - Enrichissement des candidats avec des informations de type supplémentaires
   - Harmonisation des types entre les différentes sources de connaissances
   - Amélioration de la cohérence des types à travers les différentes sources

5. **Analyse des relations entre colonnes** (optionnel) :
   - Détection des relations sémantiques potentielles entre colonnes
   - Identification des motifs comme pays-capitale, personne-profession, etc.
   - Calcul des scores de relation pour renforcer la confiance dans les types détectés
   - Création d'une structure de données représentant les relations entre colonnes

6. **Analyse approfondie des URI** (optionnel) :
   - Analyse des URI des entités pour extraire des informations supplémentaires
   - Recherche de motifs et de structures dans les URI qui peuvent indiquer le type
   - Renforcement des scores de confiance basé sur l'analyse des URI
   - Enrichissement des candidats avec les informations extraites des URI

7. **Extraction des types** :
   - Récupération des types associés à chaque entité candidate
   - Filtrage des types trop génériques ou non pertinents
   - Calcul des scores pour chaque type basé sur la fréquence et la confiance
   - Compilation des types par colonne avec leurs scores associés

8. **Agrégation et vote** :
   - Analyse des types candidats pour chaque colonne
   - Sélection du type le plus probable basée sur les scores et la confiance
   - Prise en compte des relations entre colonnes dans la décision finale
   - Production des annotations finales avec types assignés et scores de confiance

## Installation

### Prérequis

- [Bun](https://bun.sh/) (comme environnement d'exécution et gestionnaire de paquets)
- Node.js 16+ (pour certaines dépendances)

### Configuration

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Drosscend/cta-web-sementique
   cd cta-web-sementique
   ```

2. Installez les dépendances :
   ```bash
   bun install
   ```

3. Vérifiez l'installation :
   ```bash
   bun run src\index.ts --help
   ```

   Si tout est correctement installé, vous devriez voir un message d'aide expliquant comment utiliser l'application.

## Utilisation

### Ligne de commande

Exécutez l'algorithme CTA sur un fichier CSV :

```bash
bun run src\index.ts <chemin-du-fichier-csv> [chemin-de-sortie]
```

Exemple :
```bash
bun run src\index.ts data\test.csv
```

Cette commande analysera le fichier CSV et enregistrera les annotations dans un fichier JSON dans le répertoire `output`. Par défaut, le fichier de sortie sera nommé d'après le fichier d'entrée (par exemple, `test_annotations.json` pour `test.csv`). Le processus comprend toutes les étapes décrites dans la vue d'ensemble, depuis le chargement des données jusqu'à l'annotation finale des types de colonnes.

Vous pouvez également spécifier un chemin de sortie personnalisé :
```bash
bun run src\index.ts data\test.csv output\mes_annotations.json
```

### Utilisation programmatique

Vous pouvez également utiliser l'algorithme CTA de manière programmatique dans votre propre code :

```typescript
import { runCTA, saveAnnotations } from './src/index';

async function main() {
  // Exécution de l'algorithme CTA
  const annotations = await runCTA('data\\test.csv', {
    sampleSize: 20,                // Taille de l'échantillon
    confidenceThreshold: 0.3,      // Seuil de confiance
    useColumnRelations: true,      // Utiliser l'analyse des relations entre colonnes
    useURIAnalysis: true           // Utiliser l'analyse des URI
  });

  // Enregistrement des annotations
  await saveAnnotations(annotations, 'output\\annotations.json');

  // Utilisation des annotations
  for (const annotation of annotations) {
    console.log(`Colonne "${annotation.columnHeader}": ${annotation.assignedType.label} (confiance: ${annotation.confidence.toFixed(2)})`);

    // Affichage des types alternatifs
    if (annotation.alternativeTypes && annotation.alternativeTypes.length > 0) {
      console.log("  Types alternatifs:");
      for (const alt of annotation.alternativeTypes.slice(0, 3)) { // Afficher les 3 premiers types alternatifs
        console.log(`  - ${alt.type.label} (score: ${alt.score.toFixed(2)}, confiance: ${alt.confidence.toFixed(2)})`);
      }
    }
  }
}

main();
```

Cette approche vous permet d'intégrer le processus d'annotation dans vos propres applications et de personnaliser le traitement des résultats selon vos besoins.

### Exécution de l'exemple

Le dépôt inclut un fichier CSV d'exemple (`data/test.csv`) et un script de test :

```bash
bun run src/tests/test.ts
```

Cette commande exécutera l'algorithme CTA sur le fichier CSV d'exemple et générera des fichiers JSON dans le répertoire `output` pour chaque étape du processus. C'est un excellent moyen de voir en détail comment fonctionne l'algorithme et d'examiner les données intermédiaires produites à chaque étape.

## Configuration

L'algorithme CTA peut être configuré avec les options suivantes :

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| `sampleSize` | Nombre de lignes à échantillonner pour la détection de type | 10 |
| `confidenceThreshold` | Seuil de confiance minimum pour l'attribution de type | 0.3 |
| `useColumnRelations` | Utiliser les relations entre colonnes | true |
| `useURIAnalysis` | Analyser les URI pour des informations supplémentaires | true |
| `sparqlEndpoints.wikidata` | URL du point de terminaison SPARQL Wikidata | https://query.wikidata.org/sparql |
| `sparqlEndpoints.dbpedia` | URL du point de terminaison SPARQL DBpedia | https://dbpedia.org/sparql |

Ces options vous permettent d'ajuster le comportement de l'algorithme selon vos besoins :

- **sampleSize** : Contrôle le nombre de lignes utilisées pour l'analyse. Augmentez cette valeur pour une détection plus précise mais plus lente, particulièrement pour les grands jeux de données avec des valeurs variées.

- **confidenceThreshold** : Définit le seuil minimal de confiance pour qu'un type soit attribué à une colonne. Une valeur plus élevée rend l'algorithme plus strict et peut réduire les faux positifs, mais risque d'augmenter les faux négatifs.

- **useColumnRelations** : Active ou désactive l'analyse des relations entre colonnes (étape 5). Désactiver cette option peut accélérer le traitement pour les fichiers CSV avec de nombreuses colonnes, mais peut réduire la précision des annotations lorsque les colonnes sont sémantiquement liées.

- **useURIAnalysis** : Active ou désactive l'analyse approfondie des URI (étape 6). Désactiver cette option peut accélérer le traitement, mais peut réduire la précision des annotations lorsque les URI contiennent des informations utiles.

- **sparqlEndpoints** : Permet de configurer les points d'accès SPARQL pour Wikidata et DBpedia. Vous pouvez modifier ces URL si vous utilisez des miroirs locaux ou des endpoints alternatifs, ce qui peut améliorer les performances ou permettre de travailler hors ligne.

## Structure du projet

Le projet est organisé par domaines fonctionnels pour faciliter la maintenance et l'extension :

- `src/types`: Types et interfaces fondamentaux
  - Définit les structures de données utilisées dans tout le projet
  - Inclut les interfaces pour les tables CSV, les cellules, les entités, les types sémantiques, etc.
  - Définit les types pour la configuration et les résultats d'annotation

- `src/modules`: Modules fonctionnels pour chaque étape de l'algorithme
  - `dataPreparation.ts`: Chargement et nettoyage des données
    - Fonctions pour charger les fichiers CSV
    - Nettoyage des données (espaces, caractères spéciaux)
    - Extraction des cellules pour traitement
  - `dataCorrection.ts`: Correction et standardisation des données
    - Correction orthographique
    - Standardisation des formats
    - Normalisation des noms d'entités
  - `entitySearch.ts`: Recherche d'entités dans les bases de connaissances
    - Recherche dans DBpedia et Wikidata
    - Calcul des scores de confiance
    - Sélection des meilleures entités candidates
  - `typeMapping.ts`: Correspondance entre les types DBpedia et Wikidata
    - Mappings entre types équivalents
    - Renforcement des scores pour les types présents dans les deux sources
  - `columnRelationship.ts`: Analyse des relations entre colonnes
    - Détection des relations sémantiques
    - Calcul des distances entre types
    - Utilisation du contexte pour désambiguïsation
  - `uriAnalysis.ts`: Analyse des URI pour information supplémentaire
    - Extraction d'informations à partir des URI
    - Renforcement de la confiance basé sur les URI
  - `typeExtraction.ts`: Extraction des types pour chaque entité
    - Récupération des types via les API
    - Filtrage des types non pertinents
    - Compilation avec scores de confiance
  - `typeAggregation.ts`: Agrégation et vote pour les types finaux
    - Sélection du type le plus probable
    - Prise en compte des relations entre colonnes
    - Production des annotations finales

- `src/services`: Services pour interagir avec les API externes
  - `DBpediaService.ts`: Service pour interagir avec DBpedia
    - Recherche d'entités
    - Récupération des types
    - Gestion des requêtes SPARQL
  - `WikidataService.ts`: Service pour interagir avec Wikidata
    - Recherche d'entités
    - Récupération des types via P31
    - Gestion des requêtes SPARQL

- `src/index.ts`: Point d'entrée principal
  - Orchestration de toutes les étapes de l'algorithme
  - Gestion des arguments de ligne de commande
  - Sauvegarde des résultats

- `examples`: Fichiers CSV d'exemple et scripts de test
  - Exemples pour démontrer le fonctionnement de l'algorithme
  - Scripts de test pour validation

## Exemple de scénario

Considérons un fichier CSV simple avec deux colonnes contenant des pays et leurs capitales :

```csv
col0,col1
France,Paris
Germany,Berlin
Italy,Rome
Spain,Madrid
Portugal,Lisbon
```

Voici comment l'algorithme CTA traite ce fichier, étape par étape, avec des exemples concrets des données produites à chaque étape :

1. **Préparation et nettoyage des données** :
   - Chargement du fichier CSV dans une structure tabulaire :
   ```json
   {
     "headers": ["col0", "col1"],
     "data": [
       ["France", "Paris"],
       ["Germany", "Berlin"],
       ["Italy", "Rome"],
       ["Spain", "Madrid"],
       ["Portugal", "Lisbon"]
     ]
   }
   ```
   - Extraction des cellules pour chaque colonne pour traitement ultérieur

2. **Correction des données** :
   - Normalisation des valeurs pour améliorer la correspondance d'entités
   - Les valeurs sont déjà bien formatées dans cet exemple, donc peu de corrections nécessaires

3. **Recherche d'entités** :
   - Pour la colonne "col0" (pays), plusieurs entités candidates sont identifiées pour chaque valeur :
   ```json
   {
     "cell": {
       "value": "France",
       "rowIndex": 0,
       "columnIndex": 0
     },
     "entity": {
       "uri": "http://www.wikidata.org/entity/Q142",
       "label": "France",
       "description": "country in Western Europe",
       "source": "Wikidata",
       "confidence": 1
     },
     "types": [
       {
         "uri": "http://www.wikidata.org/entity/Q6256",
         "label": "country",
         "source": "Wikidata"
       },
       {
         "uri": "http://www.wikidata.org/entity/Q7270",
         "label": "republic",
         "source": "Wikidata"
       },
       {
         "uri": "http://www.wikidata.org/entity/Q3624078",
         "label": "sovereign state",
         "source": "Wikidata"
       }
     ],
     "score": 1
   }
   ```
   - D'autres candidats sont également identifiés (par exemple, "France" comme prénom ou nom de famille)
   - Processus similaire pour la colonne "col1" (capitales)

4. **Correspondance entre types** :
   - Enrichissement des candidats avec des mappings entre types DBpedia et Wikidata
   - Par exemple, le type "country" de Wikidata est associé au type "Country" de DBpedia

5. **Analyse des relations entre colonnes** :
   - Détection d'une relation entre les colonnes "col0" et "col1"
   - Identification de la relation "capitale de" entre les entités
   ```json
   {
     "sourceColumnIndex": 1,
     "targetColumnIndex": 0,
     "relationLabel": "capital of",
     "confidence": 0.8,
     "examples": [
       {
         "source": "Paris",
         "target": "France"
       },
       {
         "source": "Berlin",
         "target": "Germany"
       }
     ]
   }
   ```

6. **Analyse des URI** :
   - Analyse des URI pour extraire des informations supplémentaires
   - Renforcement des scores de confiance basé sur les motifs dans les URI

7. **Extraction des types** :
   - Compilation des types pour chaque colonne avec leurs scores :
   ```json
   {
     "columnIndex": 0,
     "types": [
       {
         "uri": "http://dbpedia.org/ontology/Country",
         "label": "country",
         "source": "DBpedia",
         "score": 13.84,
         "entityMatches": 15,
         "confidence": 1
       },
       {
         "uri": "http://www.wikidata.org/entity/Q6256",
         "label": "country",
         "source": "Wikidata",
         "score": 5.73,
         "entityMatches": 6,
         "confidence": 0.48
       }
     ]
   }
   ```

8. **Agrégation et vote** :
   - Sélection finale des types pour chaque colonne :
   ```json
   [
     {
       "columnIndex": 0,
       "columnHeader": "col0",
       "assignedType": {
         "uri": "http://dbpedia.org/ontology/PopulatedPlace",
         "label": "populated place",
         "source": "DBpedia"
       },
       "confidence": 1,
       "alternativeTypes": [
         {
           "type": {
             "uri": "http://dbpedia.org/ontology/Country",
             "label": "country",
             "source": "DBpedia"
           },
           "score": 13.84,
           "entityMatches": 15,
           "confidence": 1
         }
       ]
     },
     {
       "columnIndex": 1,
       "columnHeader": "col1",
       "assignedType": {
         "uri": "http://dbpedia.org/ontology/Settlement",
         "label": "Settlement",
         "source": "DBpedia"
       },
       "confidence": 1,
       "alternativeTypes": [
         {
           "type": {
             "uri": "http://dbpedia.org/ontology/City",
             "label": "city",
             "source": "DBpedia"
           },
           "score": 15,
           "entityMatches": 15,
           "confidence": 1
         }
       ]
     }
   ]
   ```

Le résultat final montre que la colonne "col0" est identifiée comme contenant des "populated place" (lieux peuplés) avec "country" (pays) comme type alternatif, et la colonne "col1" est identifiée comme contenant des "Settlement" (établissements humains) avec "city" (ville) comme type alternatif. Ces annotations peuvent être utilisées pour enrichir sémantiquement les données CSV d'origine, en exploitant non seulement le contenu des cellules mais aussi les relations sémantiques entre les colonnes.

## Auteur
- [Véronési Kévin](mailto:kevin.veronesi@proton.me)
- [Tandol Noémie](mailto:noemie.tandol@gmail.com)
