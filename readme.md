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
bun run src\index.ts <chemin-du-fichier-csv> [chemin-de-sortie] [options]
```

Exemple de base :
```bash
bun run src\index.ts data\test.csv
```

Cette commande analysera le fichier CSV et enregistrera les annotations dans deux formats :

1. Un fichier JSON dans le répertoire `output`. Par défaut, le fichier de sortie sera nommé d'après le fichier d'entrée (par exemple, `test_annotations.json` pour `test.csv`). Ce fichier contient les annotations détaillées avec les types assignés, les scores de confiance, et les types alternatifs.

2. Un fichier CSV nommé `cta_ft.csv` dans le répertoire `output`. Ce fichier contient les annotations au format simplifié : `nom_fichier_sans_extension,colonne,uri`. Par exemple : `test,0,http://www.wikidata.org/entity/Q6256`.

Le processus comprend toutes les étapes décrites dans la vue d'ensemble, depuis le chargement des données jusqu'à l'annotation finale des types de colonnes.

Vous pouvez également spécifier un chemin de sortie personnalisé :
```bash
bun run src\index.ts data\test.csv output\mes_annotations.json
```

### Options de ligne de commande

L'algorithme CTA accepte plusieurs options pour personnaliser son comportement :

```bash
# Augmenter la taille de l'échantillon pour une meilleure précision
bun run src\index.ts data\test.csv --sample=20

# Définir un seuil de confiance plus élevé pour des annotations plus fiables
bun run src\index.ts data\test.csv --confidence=0.5

# Désactiver l'analyse des relations entre colonnes pour un traitement plus rapide
bun run src\index.ts data\test.csv --no-relations

# Désactiver l'analyse des URI
bun run src\index.ts data\test.csv --no-uri-analysis

# Combiner plusieurs options
bun run src\index.ts data\test.csv --sample=30 --confidence=0.4 --no-uri-analysis
```

Options disponibles :

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| `--sample=N` | Nombre de lignes à échantillonner pour la détection de type | 10 |
| `--confidence=N.N` | Seuil de confiance minimum pour l'attribution de type | 0.3 |
| `--no-relations` | Désactive l'analyse des relations entre colonnes | (activé) |
| `--no-uri-analysis` | Désactive l'analyse des URI | (activé) |
| `--help` | Affiche l'aide et les informations d'utilisation | - |

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
    // Toutes les configurations sont centralisées dans src/config.ts
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

L'algorithme CTA utilise une approche de configuration centralisée. Toutes les configurations par défaut sont regroupées dans le fichier `src/config.ts`, ce qui facilite la maintenance et la personnalisation.

### Configuration principale

Les options principales de l'algorithme CTA sont les suivantes :

| Option | Description | Valeur par défaut | Impact |
|--------|-------------|-------------------|--------|
| `sampleSize` | Nombre de lignes à échantillonner pour la détection de type | 10 | Équilibre entre précision et performance |
| `confidenceThreshold` | Seuil de confiance minimum pour l'attribution de type | 0.3 | Équilibre entre couverture et fiabilité |
| `useColumnRelations` | Utiliser les relations entre colonnes | true | Améliore la précision pour les colonnes liées |
| `useURIAnalysis` | Analyser les URI pour des informations supplémentaires | true | Aide à la désambiguïsation des entités |
| `sparqlEndpoints.wikidata` | URL du point de terminaison SPARQL Wikidata | https://query.wikidata.org/sparql | Accès aux données Wikidata |
| `sparqlEndpoints.dbpedia` | URL du point de terminaison SPARQL DBpedia | https://dbpedia.org/sparql | Accès aux données DBpedia |

Ces options peuvent être configurées via la ligne de commande (voir section [Options de ligne de commande](#options-de-ligne-de-commande)) ou programmatiquement. Voici des détails sur l'impact de chaque paramètre :

#### sampleSize

Contrôle le nombre de lignes utilisées pour l'analyse des types de colonnes.

**Impact :**
- **Valeurs plus élevées** : Améliorent la précision en analysant plus de données, mais augmentent le temps de traitement
- **Valeurs plus basses** : Accélèrent le traitement mais peuvent réduire la précision, surtout pour les colonnes hétérogènes
- **Recommandation** : Augmentez cette valeur pour les grands jeux de données avec des valeurs diverses
- **Cas particulier** : Pour les petits jeux de données (<100 lignes), envisagez d'utiliser toutes les lignes (définir à 0)

#### confidenceThreshold

Définit le seuil minimal de confiance pour qu'un type soit attribué à une colonne.

**Impact :**
- **Valeurs plus élevées** (proche de 1.0) : Garantissent des attributions de type plus fiables mais peuvent laisser certaines colonnes sans type
- **Valeurs plus basses** : Augmentent la couverture mais peuvent introduire des attributions de type incorrectes
- **Attention** : Les valeurs inférieures à 0.2 peuvent entraîner de nombreux faux positifs
- **Attention** : Les valeurs supérieures à 0.7 peuvent être trop restrictives pour les colonnes ambiguës

#### useColumnRelations

Active ou désactive l'analyse des relations entre colonnes.

**Impact :**
- **Activé** : Améliore la précision en tenant compte des relations sémantiques entre colonnes
- **Particulièrement utile** : Pour les colonnes liées (ex: pays-capitale, personne-profession)
- **Désactivé** : Réduit le temps de traitement mais peut diminuer la précision pour les colonnes liées
- **Recommandation** : Garder activé sauf si les performances sont critiques

#### useURIAnalysis

Active ou désactive l'analyse approfondie des URI.

**Impact :**
- **Activé** : Extrait des informations supplémentaires des URI pour améliorer la détection de type
- **Avantage** : Aide à la désambiguïsation lorsque des entités ont des libellés similaires
- **Désactivé** : Réduit légèrement le temps de traitement mais peut diminuer la précision pour les entités ambiguës
- **Recommandation** : Impact minimal sur les performances, généralement recommandé de garder activé

#### sparqlEndpoints

Permet de configurer les points d'accès SPARQL pour Wikidata et DBpedia.

**Impact :**
- **Points d'accès alternatifs** : Peuvent améliorer les performances ou permettre un traitement hors ligne
- **Attention** : Les points d'accès personnalisés peuvent avoir des limites de taux ou des capacités de requête différentes
- **Prérequis** : S'assurer que le point d'accès prend en charge les mêmes modèles de requête

### Configurations des modules

Chaque module de l'application possède également sa propre configuration spécifique, toutes centralisées dans `src/config.ts`. Ces configurations avancées permettent un réglage fin du comportement de l'algorithme.

#### ColumnRelationshipConfig

Configuration pour l'analyse des relations entre colonnes.

| Option | Description | Défaut | Impact |
|--------|-------------|--------|--------|
| `minRelationConfidence` | Seuil de confiance minimum pour les relations | 0.3 | Les valeurs plus élevées réduisent les faux positifs, les valeurs plus basses capturent plus de relations potentielles |
| `maxRelationsPerColumn` | Nombre maximum de relations par colonne | 3 | Les valeurs plus basses améliorent les performances, la plupart des colonnes ont 1-2 relations significatives |

#### EntitySearchConfig

Configuration pour la recherche d'entités.

| Option | Description | Défaut | Impact |
|--------|-------------|--------|--------|
| `maxEntitiesPerCell` | Nombre maximum d'entités par cellule | 3 | Les valeurs plus élevées capturent plus de correspondances potentielles mais augmentent le temps de traitement |
| `minConfidence` | Seuil de confiance minimum pour les entités | 0.3 | Les valeurs plus élevées assurent des correspondances plus fiables mais peuvent réduire la couverture |
| `useWikidata` | Utiliser Wikidata | true | Wikidata offre une large couverture dans de nombreux domaines |
| `useDBpedia` | Utiliser DBpedia | true | DBpedia fournit des hiérarchies de types riches et des informations spécifiques au domaine |
| `language` | Langue pour la recherche d'entités | "en" | Affecte la correspondance des entités dans les bases de connaissances multilingues |

#### TypeAggregationConfig

Configuration pour l'agrégation des types.

| Option | Description | Défaut | Impact |
|--------|-------------|--------|--------|
| `minConfidenceThreshold` | Seuil de confiance minimum pour l'attribution de type | 0.3 | Les valeurs plus élevées assurent des attributions plus fiables mais peuvent laisser des colonnes sans type |
| `relationBoostFactor` | Facteur de boost basé sur les relations | 0.2 | Les valeurs plus élevées donnent plus de poids aux relations entre colonnes |

#### TypeExtractionConfig

Configuration pour l'extraction des types.

| Option | Description | Défaut | Impact |
|--------|-------------|--------|--------|
| `minTypeConfidence` | Seuil de confiance minimum pour les types | 0.2 | Les valeurs plus élevées assurent des types plus fiables mais peuvent réduire la variété des candidats |
| `maxTypesPerColumn` | Nombre maximum de types par colonne | 5 | Les valeurs plus basses se concentrent sur les candidats de type les plus forts, améliorant les performances |
| `useParentTypes` | Utiliser les types parents | true | Améliore la couverture en considérant des types plus généraux dans la hiérarchie |

#### URIAnalysisConfig

Configuration pour l'analyse des URI.

| Option | Description | Défaut | Impact |
|--------|-------------|--------|--------|
| `confidenceBoost` | Boost de confiance lors d'une correspondance | 0.2 | Les valeurs plus élevées donnent plus de poids aux correspondances d'URI, améliorant potentiellement la désambiguïsation |
| `minMatchLength` | Longueur minimum pour une correspondance | 3 | Les valeurs plus élevées réduisent les faux positifs en exigeant des correspondances plus longues |

## Structure du projet

Le projet est organisé par domaines fonctionnels pour faciliter la maintenance et l'extension :

- `src/types`: Types et interfaces fondamentaux
  - Définit les structures de données utilisées dans tout le projet
  - Inclut les interfaces pour les tables CSV, les cellules, les entités, les types sémantiques, etc.
  - Définit les types pour la configuration et les résultats d'annotation

- `src/config.ts`: Configuration centralisée
  - Regroupe toutes les configurations par défaut de l'application
  - Définit les interfaces de configuration pour chaque module
  - Facilite la maintenance et la personnalisation des paramètres

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
