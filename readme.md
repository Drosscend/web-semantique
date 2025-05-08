# Annotation de Type de Colonne CSV vers RDF (CTA)

Ce projet implémente un algorithme d'Annotation de Type de Colonne (CTA) qui détermine automatiquement le type sémantique de colonnes spécifiques dans des fichiers CSV en utilisant les bases de connaissances Wikidata et DBpedia.

## Vue d'ensemble

L'algorithme CTA prend en entrée un fichier CSV contenant des IDs et des colonnes à analyser, puis recherche les fichiers CSV correspondants dans un dossier spécifié. Il analyse ensuite les colonnes indiquées et remplit le fichier d'entrée avec les URIs des types détectés.

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

Exécutez l'algorithme CTA avec le fichier d'entrée et le dossier contenant les fichiers CSV :

```bash
bun run src\index.ts <chemin-fichier-csv-entrée> <chemin-dossier-csv> [options]
```

#### Exemple de base

```bash
bun run src\index.ts input.csv data\dossier_csv
```

Cette commande :
1. Lit le fichier `input.csv` contenant les IDs et les colonnes à analyser
2. Recherche les fichiers CSV correspondants dans le dossier `data\dossier_csv`
3. Analyse les colonnes spécifiées dans chaque fichier CSV
4. Met à jour le fichier `input.csv` avec les URIs des types détectés

#### Format du fichier d'entrée

Le fichier CSV d'entrée doit être au format suivant :
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

### Options de ligne de commande

L'algorithme CTA accepte plusieurs options pour personnaliser son comportement :

```bash
# Augmenter la taille de l'échantillon pour une meilleure précision
bun run src\index.ts input.csv data\dossier_csv --sample=20

# Définir un seuil de confiance plus élevé pour des annotations plus fiables
bun run src\index.ts input.csv data\dossier_csv --confidence=0.5

# Combiner plusieurs options
bun run src\index.ts input.csv data\dossier_csv --sample=30 --confidence=0.4
```

Options disponibles :

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| `--sample=N` | Nombre de lignes à échantillonner pour la détection de type | 50                |
| `--confidence=N.N` | Seuil de confiance minimum pour l'attribution de type | 0.3               |
| `--help` | Affiche l'aide et les informations d'utilisation | -                 |

## Architecture et Fonctionnement

### Modules Principaux

L'application est organisée en modules spécialisés qui traitent chaque étape du processus d'annotation :

1. **Préparation des Données** : Chargement et nettoyage automatique des fichiers CSV
2. **Correction des Données** : Normalisation des valeurs pour améliorer la correspondance
3. **Recherche d'Entités** : Identification des entités dans Wikidata et DBpedia
4. **Mappage de Types** : Correspondance entre les types DBpedia et Wikidata
5. **Relations de Colonnes** : Analyse des relations sémantiques entre colonnes
6. **Analyse URI** : Extraction d'informations à partir des URIs
7. **Extraction de Types** : Récupération des types associés aux entités
8. **Agrégation de Types** : Sélection du type final pour chaque colonne selon la fréquence maximale parmi les candidats

### Priorité des Types Wikidata

L'algorithme privilégie les types Wikidata pour l'annotation finale. Lorsque seuls des types DBpedia sont disponibles, ils sont automatiquement convertis en types Wikidata équivalents grâce à un système de mappage prédéfini.

Ce processus garantit une cohérence dans les annotations et facilite l'intégration avec d'autres systèmes utilisant Wikidata comme référence.

## Auteur
- [Véronési Kévin](mailto:kevin.veronesi@proton.me)
- [Tandol Noémie](mailto:noemie.tandol@gmail.com)
