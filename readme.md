# Annotation CSV vers RDF (CTA/CEA)

Ce projet implémente deux types d'annotation automatique pour les fichiers CSV :
- **Annotation de Type de Colonne (CTA)** : Détermine automatiquement le type sémantique de colonnes spécifiques dans des fichiers CSV en utilisant les bases de connaissances Wikidata et DBpedia.
- **Annotation d'Entités de Cellule (CEA)** : Identifie et annote les entités pour chaque cellule d'un fichier CSV en utilisant les bases de connaissances Wikidata et DBpedia.

## Vue d'ensemble

L'application propose deux modes de fonctionnement pour chaque type d'annotation (CTA et CEA) :

1. **Mode simple** : Traite un seul fichier CSV et affiche les résultats dans la console
2. **Mode batch** : Traite un lot de fichiers CSV basé sur un fichier d'entrée et un dossier de fichiers CSV

### Annotation de Type de Colonne (CTA)

L'algorithme CTA (Column Type Annotation) prend en entrée un fichier CSV contenant des IDs et des colonnes à analyser, puis recherche les fichiers CSV correspondants dans un dossier spécifié. Il analyse ensuite les colonnes indiquées et remplit le fichier d'entrée avec les URIs des types détectés.

Le processus fonctionne en plusieurs étapes :

1. **Chargement du fichier d'entrée** : 
   - Lecture du fichier CSV d'entrée contenant les IDs et les colonnes à analyser
   - Format attendu : `ID,colonne,résultat`
   - Exemple :
     ```
     IUPOCN5C,0,
     BQC7DZZR,0,
     C8RTQNU5,0,
     ```

2. **Recherche des fichiers CSV** :
   - Recherche des fichiers CSV correspondants dans le dossier spécifié
   - Les noms des fichiers doivent correspondre aux IDs du fichier d'entrée

3. **Analyse des colonnes** :
   - Pour chaque entrée du fichier d'entrée, l'algorithme analyse la colonne spécifiée dans le fichier CSV correspondant
   - L'algorithme nettoie automatiquement les valeurs lors du chargement du CSV, puis détermine le type sémantique de la colonne en utilisant Wikidata et DBpedia

4. **Mise à jour du fichier d'entrée** :
   - L'algorithme remplit la troisième colonne du fichier d'entrée avec les URIs des types détectés
   - Le fichier d'entrée est mis à jour avec les résultats

#### Fonctionnement détaillé de l'algorithme CTA

L'algorithme CTA est composé de 8 étapes principales qui permettent de déterminer avec précision le type sémantique d'une colonne :

1. **Chargement et préparation des données CSV** :
   - Lecture du fichier CSV avec gestion des délimiteurs et des guillemets
   - Nettoyage des valeurs (suppression des espaces superflus, normalisation des caractères spéciaux)
   - Extraction d'un échantillon représentatif de cellules pour chaque colonne (configurable via `sampleSize`)
   - Sélection intelligente des lignes pour garantir un échantillon représentatif (premières, dernières et lignes intermédiaires)

2. **Correction des données** :
   - Standardisation de la capitalisation (majuscules/minuscules) selon le contexte
   - Correction des fautes d'orthographe courantes (fonction présente, mais pas encore implémentée)
   - Normalisation des formats de dates (conversion vers le format ISO YYYY-MM-DD)
   - Standardisation des formats numériques (gestion des séparateurs décimaux et des milliers)
   - Utilisation d'un cache local pour éviter les corrections redondantes

3. **Recherche d'entités** :
   - Interrogation parallèle des bases de connaissances Wikidata et DBpedia
   - Recherche des entités correspondant aux valeurs des cellules
   - Classement et filtrage des candidats selon leur score de confiance
   - Récupération des types sémantiques pour chaque entité candidate
   - Traitement par lots avec délais configurables pour respecter les limites des API
   - Mécanisme de retry avec backoff exponentiel en cas d'erreurs réseau

4. **Mappage entre les types DBpedia et Wikidata** :
   - Établissement de correspondances entre les types DBpedia et Wikidata
   - Enrichissement des candidats avec des types provenant des deux bases de connaissances
   - Utilisation d'un dataset de mappage prédéfini pour garantir la cohérence

5. **Analyse des relations entre colonnes** (si activé via `useColumnRelations`) :
   - Détection des relations sémantiques entre les colonnes (ex: pays-capitale, personne-profession)
   - Calcul de scores de confiance pour chaque relation détectée
   - Utilisation de ces relations pour améliorer la détection de types

6. **Analyse des URI** (si activé via `useURIAnalysis`) :
   - Extraction d'informations supplémentaires à partir des URI des entités
   - Amélioration de la désambiguïsation pour les entités ayant des libellés similaires
   - Ajustement des scores de confiance en fonction des correspondances dans les URI

7. **Extraction des types** :
   - Récupération des types directs et des types parents pour chaque entité
   - Filtrage des types selon leur pertinence et leur score de confiance
   - Agrégation des types au niveau de la colonne

8. **Agrégation et vote sur les types finaux** :
   - Calcul de la fréquence de chaque type dans la colonne
   - Prise en compte des relations entre colonnes pour ajuster les scores
   - Sélection du type final selon le score de confiance et la fréquence
   - Application d'un seuil de confiance minimal (configurable via `confidenceThreshold`)

### Annotation d'Entités de Cellule (CEA)

L'algorithme CEA (Cell Entity Annotation) identifie et annote les entités pour chaque cellule d'un fichier CSV. En mode batch, il prend en entrée un fichier CSV contenant des IDs, des lignes et des colonnes à analyser, puis recherche les fichiers CSV correspondants dans un dossier spécifié.

Le processus fonctionne en plusieurs étapes :

1. **Chargement du fichier d'entrée** : 
   - Lecture du fichier CSV d'entrée contenant les IDs, les lignes et les colonnes à analyser
   - Format attendu : `ID,row,colonne,uri`
   - Exemple :
     ```
     FICHIER1,2,3,
     FICHIER2,0,1,
     FICHIER3,5,0,
     ```

2. **Recherche des fichiers CSV** :
   - Recherche des fichiers CSV correspondants dans le dossier spécifié
   - Les noms des fichiers doivent correspondre aux IDs du fichier d'entrée

3. **Analyse des cellules** :
   - Pour chaque entrée du fichier d'entrée, l'algorithme analyse la cellule spécifiée dans le fichier CSV correspondant
   - L'algorithme nettoie automatiquement les valeurs lors du chargement du CSV, puis identifie les entités correspondantes en utilisant Wikidata et DBpedia

4. **Mise à jour du fichier d'entrée** :
   - L'algorithme remplit la quatrième colonne du fichier d'entrée avec les URIs des entités détectées
   - Le fichier d'entrée est mis à jour avec les résultats

#### Fonctionnement détaillé de l'algorithme CEA

L'algorithme CEA est composé de 3 étapes principales qui permettent d'identifier avec précision les entités correspondant à chaque cellule d'un fichier CSV :

1. **Chargement et préparation des données CSV** :
   - Lecture du fichier CSV avec gestion des délimiteurs et des guillemets
   - Nettoyage des valeurs (suppression des espaces superflus, normalisation des caractères spéciaux)
   - Extraction des cellules pour chaque colonne
   - Contrairement à CTA, CEA traite toutes les lignes du fichier (pas d'échantillonnage)

2. **Correction des données** :
   - Standardisation de la capitalisation (majuscules/minuscules) selon le contexte
   - Correction des fautes d'orthographe courantes
   - Normalisation des formats de dates (conversion vers le format ISO YYYY-MM-DD)
   - Standardisation des formats numériques (gestion des séparateurs décimaux et des milliers)
   - Utilisation d'un cache local pour éviter les corrections redondantes

3. **Recherche d'entités** :
   - Interrogation parallèle des bases de connaissances Wikidata et DBpedia
   - Recherche des entités correspondant aux valeurs des cellules
   - Classement et filtrage des candidats selon leur score de confiance
   - Récupération des types sémantiques pour chaque entité candidate
   - Traitement par lots avec délais configurables pour respecter les limites des API
   - Mécanisme de retry avec backoff exponentiel en cas d'erreurs réseau

4. **Préparation des résultats** :
   - Sélection de la meilleure entité pour chaque cellule (celle avec le score de confiance le plus élevé)
   - Priorité donnée aux entités Wikidata (les entités DBpedia sont ignorées si des entités Wikidata sont disponibles)
   - Création d'une liste d'annotations contenant pour chaque cellule : numéro de ligne, numéro de colonne, URI de l'entité et score de confiance
   - Filtrage des résultats selon un seuil de confiance minimal

## Installation

### Prérequis

- [Bun](https://bun.sh/) (comme environnement d'exécution et gestionnaire de paquets)
- Node.js 16+ (pour certaines dépendances)

### Configuration

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Drosscend/cta-web-semantique
   cd cta-web-semantique
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

L'application propose deux modes d'utilisation :
1. **Mode interactif** (recommandé) : Interface avec menu permettant de configurer facilement les options
2. **Mode ligne de commande** : Pour une utilisation plus avancée ou dans des scripts

### Mode interactif

Pour lancer l'interface interactive avec menu :

```bash
bun run src\index.ts
```

Cette commande lance un menu interactif qui vous guide à travers les étapes suivantes :
1. Choix du type d'annotation (CTA ou CEA)
2. Sélection d'un preset de configuration (pour CTA) ou configuration personnalisée
3. Choix du mode de traitement (simple ou batch)
4. Configuration des paramètres spécifiques

#### Presets de configuration (CTA)

L'interface interactive propose trois presets de configuration pour l'algorithme CTA :
- **Précision basse** : Traitement rapide, moins précis (échantillon de 20 lignes, seuil de confiance de 0.2)
- **Précision moyenne** : Équilibre entre vitesse et précision (échantillon de 50 lignes, seuil de confiance de 0.3)
- **Précision élevée** : Traitement plus lent, plus précis (échantillon de 100 lignes, seuil de confiance de 0.4)

### Mode ligne de commande

Pour afficher l'aide et les informations d'utilisation :

```bash
bun run src\index.ts --help
```

#### Format des fichiers d'entrée

Pour le mode batch, les fichiers d'entrée doivent respecter les formats suivants :

**Format CTA** :
```
ID,colonne,résultat
```

Où :
- `ID` est l'identifiant du fichier CSV à analyser (sans l'extension .csv)
- `colonne` est l'index de la colonne à analyser (commençant à 0)
- `résultat` est la colonne qui sera remplie avec l'URI du type détecté

Exemple :
```
IUPOCN5C,0,
BQC7DZZR,0,
C8RTQNU5,0,
```

**Format CEA** :
```
ID,row,colonne,uri
```

Où :
- `ID` est l'identifiant du fichier CSV à analyser (sans l'extension .csv)
- `row` est l'index de la ligne à analyser (commençant à 1)
- `colonne` est l'index de la colonne à analyser (commençant à 0)
- `uri` est la colonne qui sera remplie avec l'URI de l'entité détectée

Exemple :
```
FICHIER1,2,3,
FICHIER2,0,1,
FICHIER3,5,0,
```

## Architecture et Fonctionnement

### Modules Principaux

L'application est organisée en modules spécialisés qui traitent chaque étape du processus d'annotation :

#### Modules communs (CTA et CEA)
1. **Préparation des Données** : Chargement et nettoyage automatique des fichiers CSV
2. **Correction des Données** : Normalisation des valeurs pour améliorer la correspondance
3. **Recherche d'Entités** : Identification des entités dans Wikidata et DBpedia

#### Modules spécifiques à CTA
4. **Mappage de Types** : Correspondance entre les types DBpedia et Wikidata
5. **Relations de Colonnes** : Analyse des relations sémantiques entre colonnes
6. **Analyse URI** : Extraction d'informations à partir des URIs
7. **Extraction de Types** : Récupération des types associés aux entités
8. **Agrégation de Types** : Sélection du type final pour chaque colonne selon la fréquence maximale parmi les candidats

### Priorité des Types Wikidata

L'algorithme privilégie les types Wikidata pour l'annotation finale. Lorsque seuls des types DBpedia sont disponibles, ils sont automatiquement convertis en types Wikidata équivalents grâce à un système de mappage prédéfini.

Ce processus garantit une cohérence dans les annotations et facilite l'intégration avec d'autres systèmes utilisant Wikidata comme référence.

### Différences entre CTA et CEA

- **CTA (Column Type Annotation)** : Analyse les valeurs d'une colonne entière pour déterminer le type sémantique le plus approprié pour cette colonne.
- **CEA (Cell Entity Annotation)** : Identifie l'entité spécifique correspondant à chaque cellule individuelle dans le fichier CSV.

Les deux algorithmes partagent les étapes initiales de préparation et de correction des données, ainsi que la recherche d'entités, mais diffèrent dans leurs objectifs finaux et leurs méthodes d'agrégation des résultats.

## Auteur
- [Véronési Kévin](mailto:kevin.veronesi@proton.me)
- [Tandol Noémie](mailto:noemie.tandol@gmail.com)
