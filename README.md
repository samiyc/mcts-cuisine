# mcts-cuisine

Une cuisine à la *Overcooked* : un cuisinier humain et des robots préparent et servent les commandes qui
arrivent. Les recettes s'enchaînent : couper, cuire, dresser, servir. Les robots ne commandent pas le
cuisinier : ils devinent ce qu'il va faire, comme le bot de Lopin devine la main adverse, et montrent la
tâche qu'ils visent.

Statut (22/10/2026) : le simulateur d'un service sur trois cuisines, deux règles pour les robots et trois
cuisiniers simulés, comparés par paires (`npm run compare`, [`docs/modele.md`](docs/modele.md)), et la page
(`npm run page`, http://127.0.0.1:4803/web/) où l'on regarde le service et où l'on dessine sa cuisine. Pas
encore de recherche. Étape 3 de la
[feuille de route](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/feuille-de-route.md),
après l'entrepôt, dont elle reprend le moteur de grille (`grid` de `mcts-commun`) et ajoute les
enchaînements.

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

## D'où ça vient

- [`planification.md`](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/planification.md) § 4 :
  la cuisine à la *Overcooked*.
- [`feuille-de-route.md`](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/feuille-de-route.md)
  § 3 : la coopération entre un humain et des robots.
