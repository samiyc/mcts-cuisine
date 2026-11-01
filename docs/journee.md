# La journée : la cuisine vitrine

Sami (1/11/2026) voulait une cuisine plus complète que la brigade avec plonge, sur une journée entière, avec le visuel
du grand CHU de mcts-urgences : « ça grouille ». Ce que disent les sources est dans
[recherche/journee.md](recherche/journee.md), les questions qui restent dans
[recherche/questions-specialiste.md](recherche/questions-specialiste.md) (25 à 33).

Ses choix : un service du soir d'abord, la salle et les clients juste après le service en cuisine, des règles d'abord,
sans recherche. **Tous les chiffres du modèle sont des hypothèses, sauf ceux qui nomment leur source.**

## Un modèle à part

Le service (`src/simulate.js`) planifie chaque pas dans le temps, autour des autres : il ne tiendrait pas sur 16 h avec
des dizaines de personnes. La journée reprend la méthode du grand CHU :

- **les chemins sont gardés** : une distance par cible (`createDistances` de mcts-commun), un chemin par paire de cases
  (`dayLayout`, `src/day-plan.js`) ;
- **les allées laissent passer tout le monde** : personne ne réserve sa route, et l'écran écarte ceux qui sont sur une
  même case. Un poste, lui, ne sert qu'à une personne à la fois, et les autres attendent à côté (test) ;
- **la journée se calcule une fois**, à la file des événements de mcts-commun (`createEvents`), et laisse une trace ; la
  page la rejoue (`sceneAt`, `src/day-scene.js`).

Rien de tout cela ne touche au service : les neuf cuisines et leurs empreintes ne bougent pas.

## Le plan

Il est en texte (`DAY_PLAN`, `src/day-plan.js`, sa légende en tête), modifiable dans l'onglet, « Modifier le plan ». Un
plan impossible est refusé en français : ce qui manque, ou le poste qu'on n'atteint pas depuis le quai. C'est un premier
brouillon : Sami le rendra plus carré et plus beau.

## Ce qui est fait

### La réception (étape 1)

Le camion est à quai à 8 h, et la brigade entre par la porte arrière. Le chef et le second contrôlent trois lots (5 min
chacun) ; le frais d'abord, puis le tempéré, puis l'épicerie. Une fois un lot contrôlé, ses caisses sont offertes à
toute l'équipe : on prend le frais d'abord, sur les 120 caisses (60, 36 et 24). Chaque cuisinier prend la tâche la plus
prioritaire qu'il sait faire, à égalité la plus proche.

Mesures sur la journée n° 1, avec le plan brouillon : tout est rangé à 8 h 31 ; le calcul prend 32 ms, avec 136 chemins
gardés.
