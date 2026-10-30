# mcts-cuisine

Une cuisine à la *Overcooked* : un cuisinier humain et des robots préparent et servent les commandes qui
arrivent. Les recettes s'enchaînent : couper, cuire, dresser, servir. Les robots ne commandent pas le
cuisinier : ils devinent ce qu'il va faire, comme le bot de Lopin devine la main adverse, et montrent la
tâche qu'ils visent.

Statut (30/10/2026) :
- **Neuf cuisines**, de la petite cuisine à la dark kitchen et à la brigade avec plonge, dont trois dessinées par Sami.
- **Quatre règles pour les robots** : la plus ancienne, le plat le plus rapide, la table et le rétroplanning.
- **La recherche** (`src/search.js`, ISMCTS de `mcts-commun`), qui les bat toutes.
- **Quatre cuisiniers simulés**, et le chef au clavier (Z Q S D pour bouger, E pour travailler).
- **Les options des métiers de la cuisine** (`docs/metiers.md`) :
  - les tables, qui partent ensemble ;
  - le banquet et la livraison ;
  - la rupture et la mise en place ;
  - l'aboyeur, les assiettes et la plonge ;
  - le ménage et les allergènes ;
  - les pauses, la fatigue et les erreurs de l'humain ;
  - les pannes des robots.
- **Les comparaisons par paires** (`npm run compare`), les mesures longues dans la file de la machine
  (`docs/outillage.md`).
- **La page** (`npm run page`), en onglets : Service, avec les touches d'un lecteur ; Cuisine ; Replays ; Stats.

Le modèle de départ : [`docs/modele.md`](docs/modele.md).
Étape 3 de la
[feuille de route](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/feuille-de-route.md),
après l'entrepôt, dont elle reprend le moteur de grille (`grid` de `mcts-commun`) et ajoute les
enchaînements.

Le 26/10, les recherches sur les métiers de la cuisine (restaurants, traiteurs, livraison) et leur feuille de
route : [`docs/recherche/`](docs/recherche/README.md).

## Le problème

- **Les commandes arrivent** pendant le service, chacune avec son délai.
- **Les recettes sont des chaînes de prérequis** : un plat se dresse quand ses ingrédients sont coupés et
  cuits ; un poste (la planche, le feu, le passe) ne sert qu'à un à la fois.
- **Le caché** : les commandes à venir, et les intentions du cuisinier.
- **La difficulté propre** : se gêner le moins possible dans une petite cuisine, et ne pas faire deux fois
  la même tâche.

## La démarche

1. **Un simulateur** pur et testé, sur la grille de l'entrepôt.
2. **Des règles de référence** : la tâche la plus proche, la commande la plus ancienne.
3. **La recherche** pour les robots, avec un **modèle du cuisinier** : au départ trois humains simulés
   (celui qui prend la tâche la plus proche, celui qui prend la plus urgente, celui qui joue au hasard).
   Carroll et al. (NeurIPS 2019) ont montré qu'un agent entraîné seulement avec lui-même coordonne mal avec
   un humain : le modèle de l'humain est le cœur du projet.
4. **La page** : on joue le cuisinier dans le navigateur, avec les robots.

## Développer

- `npm install` installe les outils et active le hook ; `npm run check` lance le lint, les types et les tests,
  comme le hook avant chaque commit.
- `npm run page` ouvre la page en onglets (Service, Cuisine, Replays, Stats) sur http://127.0.0.1:4803/web/.
- L'outillage et ses raisons : [`docs/outillage.md`](docs/outillage.md).

## D'où ça vient

- [`planification.md`](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/planification.md) § 4 :
  la cuisine à la *Overcooked*.
- [`feuille-de-route.md`](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/feuille-de-route.md)
  § 3 : la coopération entre un humain et des robots.
