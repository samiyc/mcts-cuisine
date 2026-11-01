# La journée : la cuisine vitrine

Sami (1/11/2026) voulait une cuisine plus complète que la brigade avec plonge, sur une journée entière, avec le visuel
du grand CHU de mcts-urgences : « ça grouille ». Ce que disent les sources est dans
[recherche/journee.md](recherche/journee.md), les questions qui restent dans
[recherche/questions-specialiste.md](recherche/questions-specialiste.md) (25 à 38).

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
toute l'équipe : on prend le frais d'abord, sur les 124 caisses (60, 40 et 24). Chaque cuisinier prend la tâche la plus
prioritaire qu'il sait faire, à égalité la plus proche.

Mesures sur la journée n° 1, avec le plan brouillon : tout est rangé à 8 h 31 ; le calcul prend 32 ms, avec 136 chemins
gardés.

### La production (étape 2)

Après le briefing du chef au passe, chaque plat du menu (`src/day-menu.js`) est fait par lots : on cherche les caisses
en réserve, on épluche, on coupe, on cuit. Une cuisson continue seule : le poste reste pris, avec le plat dessus, jusqu'à
ce que quelqu'un vienne la retirer, en priorité. Ce qui a cuit passe en cellule, puis au frigo ; la règle sourcée devient
un test : **moins de 2 h entre la fin de la cuisson et la fin du refroidissement**. Les salades sont coupées en dernier,
à partir de 14 h 30. Chaque étape salit de la batterie, que le plongeur lave par charges de 6 ; le commis 3 l'aide
quand il n'a rien d'autre. Les jauges montrent les caisses qui descendent et les plats qui montent.

### Le service en cuisine (étape 3)

À 16 h 30, ménage intermédiaire et bacs montés aux postes ; à 18 h 30, chacun à son poste, et le chef ne quitte plus le
passe. Un bon est le temps d'une table : chaque plat sort du frigo, est réchauffé ou cuit à la minute, dressé, posé au
passe. Quand toutes les assiettes d'un bon sont là, le chef les contrôle et les envoie. Le bon le plus ancien passe
d'abord, un peu avant le plus proche.

Une portion est réservée à la commande, et un plat épuisé sort de la carte. Une réchauffe se fait une fois, comme la
règle le demande. Aucune référence publiée du temps d'un bon ([brigade-service.md](recherche/brigade-service.md)) :
chaque cuisine se mesure contre elle-même.

### La salle (étape 4)

Les groupes entrent par leur porte à l'heure de leur réservation (voir plus bas), et vont à leur table. Ils lisent la carte, commandent, mangent jusqu'à trois temps, paient,
s'en vont. Les 6 serveurs dressent les tables à 18 h, prennent les commandes, vont au bar, portent les assiettes du
passe aux tables, débarrassent, rapportent les assiettes à la plonge, redressent les tables. Le plongeur lave par
casiers de 20. Avec eux, le plan compte environ 90 personnes au pic.

### La fermeture et le corps (étape 5)

**La fermeture** commence quand le dernier client est parti (vers 23 h avec le second service), à 22 h 30 au plus tôt : les restes rassemblés, étiquetés et
rangés, chaque poste nettoyé, le relevé des températures par le chef ou le second, les allées lavées. Les serveurs partent
par la porte des clients, puis les cuisiniers par l'arrière, quand tout est fait.

**Le corps** : chaque cuisinier a une soif qui monte deux fois plus vite au feu et une fatigue qui monte avec les heures
et la soif. Son anneau passe au orange, puis au rouge. Il boit au point d'eau quand il est libre et que la soif dépasse
60 %, 85 % au coup de feu : il tient plus longtemps. Chacun sort **15 min dans la cour, par la porte arrière**, deux par
deux à partir de 11 h 30 (le choix de Sami). Le commis 2 cuisine le repas d'équipe à 16 h 30, et tous le prennent à 17 h 30
en salle du personnel, 30 min. Un cuisinier fatigué fait ses gestes jusqu'à 25 % plus lentement.

Ces chiffres sont des hypothèses pour montrer qui va mal (question 30). La loi demande 20 min de pause dès 6 h : le repas
d'équipe en tient lieu, à confirmer (question 29).

### Les déchets, les tables, le bar (1/11, le soir)

**Les déchets** : quatre bacs en cuisine (biodéchets, cartons, verre, ordures), comme la loi le demande pour les biodéchets. Chaque
caisse ouverte laisse un carton et, pour les produits frais, des épluchures ; chaque lot, du film ; chaque assiette, des restes
raclés à la plonge ; chaque bouteille, du verre. Un bac qui contient de quoi remplir un sac appelle un commis ou le plongeur, qui
le sort par la porte arrière jusqu'au local à déchets, dans la cour. La fermeture vide tous les bacs (test : tout finit au local).

**Les tables** : une table passe par quatre états, visibles sur le plan : 🍴 dressée, occupée, 🧽 à nettoyer, ✨ propre. Après le
départ d'un groupe, un serveur débarrasse les verres et les porte à la plonge, un autre essuie, un autre va chercher le couvert et
le linge à l'office puis dresse. Un groupe ne s'assoit qu'à une table dressée (test).

**Le bar** : un barman arrive à 18 h, monte deux caisses, prépare son bar. Chaque temps d'une table lui envoie une tournée : apéritif,
vin, café. Il la prépare, la pose au bar, et un serveur la porte. Il repart chercher des caisses quand il en manque. Un groupe sans
table attend au comptoir et y prend un verre.

### Les réservations et le bar sans réservation (1/11, le soir)

**Le carnet** (`src/day-bookings.js`) : 30 demandes pour un créneau, de 19 h à 19 h 45 pour le premier service et de 21 h à 21 h 30
pour le second. Chacune prend une table libre pendant 105 min : le créneau demandé, sinon le plus proche de son service, sinon l'autre
service, sinon elle est refusée. 4 tables sur 16 restent sans réservation. Un groupe arrive de 5 min en avance à 15 min en retard, et va
à sa table ; si elle n'est pas prête, il attend au bar. Une réservation sur sept ne vient pas : sa table est libérée après 20 min.

**Sans réservation** (`src/day-walkins.js`) : 26 petits groupes, le pic vers 19 h 05, viennent au bar pour un ou deux verres. Trois sur
dix demandent une table : ils l'ont si une table dressée n'a aucune réservation proche ; sinon ils repartent. Le bar a de la place pour
36 personnes debout.

**Dans l'onglet** : le carnet se lit sous le plan, une ligne par table, une couleur par groupe, celle de ses clients sur le plan.

## Les mesures (étape 6)

`npm run journee -- 20`, 20 journées, 33 ms chacune sur la machine pleine ; le plan brouillon, 12 fourneaux et 6 fours :

| Mesure | Moyenne |
|---|---|
| clients, tables servies, assiettes | 115,4, 26,6, 172 |
| un bon : moyenne, 90ᵉ centile, pire | 9,6, 17,6, 25,3 min |
| bons en cours au pic | 8,8 |
| clients en salle au pic | 63,8 |
| temps à table | 87,4 min |
| carnet | 30 demandes, 6,0 refusées, 3,5 déplacées, 2,6 absentes |
| attente de sa table quand on a réservé | 0,3 min, 5,0 au pire |
| au bar sans réservation | 41,3 clients, 53 min, jusqu'à 30 debout ; 5,2 tables prises |
| refroidissement le plus long | 81,5 min (limite : 120) |
| remise en état d'une table | 6,2 min |
| bar | 224 verres, une tournée 2,0 min, 7,1 au pire |
| déchets | 11,3 kg de biodéchets, 52,0 de cartons, 19,5 de verre, 6,1 d'ordures |
| biodéchets par client | 154 g (repère publié : 134) |
| sacs sortis, bacs qui ont débordé | 14,6, 1,0 |
| fermeture | vers minuit, 0 h 13 au plus tard |

**Réglé à la main, sans source** : les premières durées laissaient les cuisiniers inactifs 64 % du service, sans coup
de feu. Après une assiette à 90 s, un poisson surveillé 6 min et moins de fourneaux, ce temps tombe à 45 %, et un bon
monte à 10 min. Ce sont des réglages pour que le coup de feu existe, pas des mesures de restaurant (questions 27 et 28).
**La cuisine reste moins chargée que la salle** : un poste n'est jamais plein plus de 2 % du service. Avant le carnet, ce qui
coinçait était l'attente d'une table à l'entrée (18 min en moyenne, 55 au pire). Avec le carnet, elle tombe à 0,3 min pour qui a réservé :
ce qui reste limité, c'est la salle elle-même, qui refuse 6 demandes sur 30. Plus de couverts ou moins de postes dans le plan de Sami le
verront tout de suite, dans « Les postes pris ».

Le modèle a sa propre empreinte (`day`, `tests/fingerprint.test.js`) ; celles des neuf cuisines n'ont pas bougé.

## Ce qui reste hors du modèle

Le midi et la coupure, la recherche (des règles seulement), le cuisinier au clavier, les robots. Les allées ne bloquent
personne : l'encombrement ne se voit qu'aux postes.
