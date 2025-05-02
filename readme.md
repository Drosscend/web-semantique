# Annotation de Type de Colonne CSV vers RDF (CTA)

Ce projet implémente un algorithme d'Annotation de Type de Colonne (CTA) qui détermine automatiquement le type sémantique de chaque colonne dans un fichier CSV en utilisant les bases de connaissances Wikidata et DBpedia.

## Vue d'ensemble

L'algorithme CTA fonctionne en plusieurs étapes détaillées ci-dessous :

1. **Préparation et nettoyage des données** : 
   - Chargement du fichier CSV
   - Suppression des espaces superflus
   - Normalisation des caractères spéciaux (accents, diacritiques)
   - Gestion des valeurs manquantes ou invalides
   - Analyse initiale de la qualité des données

2. **Correction des données** :
   - Correction orthographique des valeurs
   - Standardisation des formats (majuscules, minuscules, dates, nombres)
   - Normalisation des noms d'entités pour améliorer la correspondance
   - Application de règles de correction spécifiques au domaine

3. **Recherche d'entités** :
   - Recherche d'entités correspondantes dans DBpedia via son API de recherche
   - Recherche d'entités correspondantes dans Wikidata via son API
   - Calcul de scores de confiance pour chaque correspondance d'entité
   - Sélection des meilleures entités candidates pour chaque valeur de cellule

4. **Correspondance entre types** :
   - Création d'un mapping entre les types équivalents de DBpedia et Wikidata
   - Renforcement du score des types qui apparaissent dans les deux sources
   - Utilisation de mappings prédéfinis pour les types courants
   - Calcul de similarité pour détecter de nouvelles correspondances

5. **Analyse des relations entre colonnes** :
   - Calcul des distances sémantiques entre types identifiés
   - Détection des relations potentielles entre colonnes (ex: pays-capitale)
   - Utilisation des autres colonnes pour aider à désambiguïser
   - Renforcement des types compatibles avec les relations détectées

6. **Analyse approfondie des URI** :
   - Recherche des valeurs d'autres colonnes dans les URI des entités
   - Extraction d'informations supplémentaires à partir des URI
   - Utilisation de ces informations pour renforcer la confiance
   - Détection de motifs dans les URI pour améliorer la classification

7. **Extraction des types** :
   - Récupération des types via la propriété P31 ("instance of") dans Wikidata
   - Extraction des types équivalents dans DBpedia
   - Filtrage des types trop génériques ou non pertinents
   - Compilation avec les scores de confiance associés

8. **Agrégation et vote** :
   - Sélection finale du type le plus probable pour chaque colonne
   - Prise en compte des relations entre colonnes
   - Pondération basée sur les scores de confiance
   - Production du résultat final d'annotation avec scores de confiance

## Installation

### Prérequis

- [Bun](https://bun.sh/) (comme environnement d'exécution et gestionnaire de paquets)

### Configuration

1. Clonez le dépôt :
   ```bash
   git clone <url-du-dépôt>
   cd <répertoire-du-dépôt>
   ```

2. Installez les dépendances :
   ```bash
   bun install
   ```

## Utilisation

### Ligne de commande

Exécutez l'algorithme CTA sur un fichier CSV :

```bash
bun run src/index.ts <chemin-du-fichier-csv> [chemin-de-sortie]
```

Exemple :
```bash
bun run src/index.ts examples/data.csv
```

Cette commande analysera le fichier CSV et enregistrera les annotations dans un fichier JSON dans le répertoire `output`. Le processus comprend toutes les étapes décrites dans la vue d'ensemble, depuis le chargement des données jusqu'à l'annotation finale des types de colonnes.

### Utilisation programmatique

Vous pouvez également utiliser l'algorithme CTA de manière programmatique dans votre propre code :

```typescript
import { runCTA, saveAnnotations } from './src/index';

async function main() {
  // Exécution de l'algorithme CTA
  const annotations = await runCTA('chemin/vers/votre/fichier.csv', {
    sampleSize: 20,                // Taille de l'échantillon
    confidenceThreshold: 0.3       // Seuil de confiance
  });

  // Enregistrement des annotations
  await saveAnnotations(annotations, 'chemin/vers/sortie.json');

  // Utilisation des annotations
  for (const annotation of annotations) {
    console.log(`Colonne "${annotation.columnHeader}": ${annotation.assignedType.label}`);
  }
}

main();
```

Cette approche vous permet d'intégrer le processus d'annotation dans vos propres applications et de personnaliser le traitement des résultats selon vos besoins.

### Exécution de l'exemple

Le dépôt inclut un fichier CSV d'exemple et un script de test :

```bash
bun run examples/test.ts
```

Cette commande exécutera l'algorithme CTA sur le fichier CSV d'exemple et affichera les résultats. C'est un bon moyen de voir rapidement comment fonctionne l'algorithme sans avoir à préparer vos propres données.

## Configuration

L'algorithme CTA peut être configuré avec les options suivantes :

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| `sampleSize` | Nombre de lignes à échantillonner pour la détection de type | 20 |
| `confidenceThreshold` | Seuil de confiance minimum pour l'attribution de type | 0.3 |
| `useColumnRelations` | Utiliser les relations entre colonnes | true |
| `useURIAnalysis` | Analyser les URI pour des informations supplémentaires | true |
| `sparqlEndpoints.wikidata` | URL du point de terminaison SPARQL Wikidata | https://query.wikidata.org/sparql |
| `sparqlEndpoints.dbpedia` | URL du point de terminaison SPARQL DBpedia | https://dbpedia.org/sparql |

Ces options vous permettent d'ajuster le comportement de l'algorithme selon vos besoins :

- Augmentez `sampleSize` pour une détection plus précise mais plus lente
- Ajustez `confidenceThreshold` pour être plus ou moins strict dans l'attribution des types
- Désactivez `useColumnRelations` ou `useURIAnalysis` pour accélérer le traitement si ces fonctionnalités ne sont pas nécessaires
- Modifiez les points de terminaison SPARQL si vous utilisez des miroirs locaux ou des endpoints alternatifs

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

Considérons un fichier CSV avec des colonnes pour les pays et leurs capitales :

```
Pays,Capitale
France,Paris
Allemagne,Berlin
Italie,Rome
Espagne,Madrid
```

Voici comment l'algorithme CTA traite ce fichier, étape par étape :

1. **Préparation et nettoyage des données** :
   - Chargement du fichier CSV
   - Nettoyage des valeurs (suppression des espaces superflus, normalisation des caractères)
   - Création d'un échantillon représentatif (dans ce cas, toutes les lignes sont utilisées)

2. **Correction des données** :
   - Standardisation des noms (par exemple, "france" serait corrigé en "France")
   - Correction d'éventuelles fautes d'orthographe

3. **Recherche d'entités** :
   - Pour la colonne "Pays" :
     - "France" → Entité Wikidata Q142 (France) avec un score élevé
     - "Allemagne" → Entité Wikidata Q183 (Allemagne) avec un score élevé
     - Etc.
   - Pour la colonne "Capitale" :
     - "Paris" → Entité Wikidata Q90 (Paris) avec un score élevé
     - "Berlin" → Entité Wikidata Q64 (Berlin) avec un score élevé
     - Etc.

4. **Correspondance entre types** :
   - Les entités de la colonne "Pays" ont principalement le type "pays" (Q6256 dans Wikidata)
   - Les entités de la colonne "Capitale" ont principalement le type "ville" (Q515) et "capitale" (Q5119)

5. **Analyse des relations entre colonnes** :
   - Détection d'une relation forte entre les colonnes "Pays" et "Capitale"
   - Identification de la relation "hasCapital" (a pour capitale)
   - Renforcement des types "pays" et "capitale" en raison de cette relation

6. **Analyse des URI** :
   - Les URI des entités de la colonne "Capitale" contiennent souvent des références aux pays correspondants
   - Cela renforce davantage la confiance dans les types détectés

7. **Extraction des types** :
   - Compilation des types pour chaque colonne avec leurs scores de confiance
   - Colonne "Pays" : type "pays" avec un score de confiance élevé
   - Colonne "Capitale" : type "capitale" avec un score de confiance élevé

8. **Agrégation et vote** :
   - Sélection finale du type "pays" pour la colonne "Pays"
   - Sélection finale du type "capitale" pour la colonne "Capitale"
   - Production des annotations finales avec scores de confiance

Ce processus permet d'identifier avec précision que la première colonne contient des entités de type "pays" et la seconde des entités de type "capitale", en exploitant non seulement le contenu des cellules mais aussi les relations sémantiques entre les colonnes.

## Auteur
- [Véronési Kévin](mailto:kevin.veronesi@proton.me)
- [Tandol Noémie](mailto:noemie.tandol@gmail.com)