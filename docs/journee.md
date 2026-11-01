# La journée : la cuisine vitrine

Sami (1/11/2026) voulait une cuisine plus complète que la brigade avec plonge, sur une journée entière, avec le visuel
du grand CHU de mcts-urgences : « ça grouille ». Ce que disent les sources est dans
[recherche/journee.md](recherche/journee.md), les questions qui restent dans
[recherche/questions-specialiste.md](recherche/questions-specialiste.md) (25 à 39).

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
toute l'équipe : on prend le frais d'abord, sur les 140 caisses (60, 44 et 36). Chaque cuisinier prend la tâche la plus
prioritaire qu'il sait faire, à égalité la plus proche.

Mesures sur la journée n° 1, avec le plan brouillon : tout est rangé à 8 h 31 ; le calcul prend 32 ms, avec 136 chemins
gardés.

### La production (étape 2)

Après le briefing du chef au passe, chaque plat du menu (`src/day-menu.js`) est fait par lots, autant que le carnet en demande (voir plus bas) : on cherche les caisses
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

### La production d'après le carnet (1/11, le soir)

**Avant**, la cuisine faisait toujours le même nombre de lots, quel que soit le carnet : 266 portions pour 74 clients à table, 96 restes
(36 %) en moyenne sur 100 journées. **Maintenant** (`src/day-forecast.js`), le chef part du carnet :

1. les couverts réservés, ceux des demandes refusées en moins ;
2. moins les absents attendus : il connaît le taux (une réservation sur sept), jamais qui ne viendra ;
3. plus ceux qui s'attablent d'habitude sans réservation : 10 couverts (hypothèse, réglée sur ce que le modèle mesure) ;
4. par service, la part de clients qui le commandent (7 sur 10 une entrée, tous un plat, 6 sur 10 un dessert), avec **25 % de marge** ;
5. en lots entiers : au moins un lot de chaque plat, puis un lot de plus au plat qui a le moins de portions, jusqu'à la quantité voulue.

Le camion ne change pas : les courses sont faites avant, et ce qui n'est pas ouvert reste en réserve (question 39). Le tempéré passe de
40 à 44 caisses, pour qu'un carnet plein de tables de 4 ne manque de rien.

**La marge** se choisit en une ligne (`FORECAST.margin`, ou `npm run journee -- 100 0.1` pour la mesurer). Sur 100 journées :

| Marge | Portions faites | Restes | Manquantes par journée | Jours avec un manque sur 100 | Biodéchets par client | Cartons | Caisses restantes (frais, tempéré, épicerie) |
|---|---|---|---|---|---|---|---|
| 0 % | 183 | 15,9 (8,7 %) | 2,52 | 43 | 124 g | 35,9 kg | 26,1, 16,5, 15,5 |
| 10 % | 199 | 28,8 (14,5 %) | 0,69 | 16 | 130 g | 39,3 kg | 22,9, 14,4, 13,9 |
| 15 % | 204 | 33,4 (16,4 %) | 0,21 | 8 | 131 g | 40,1 kg | 22,3, 13,9, 13,5 |
| 25 % | 220 | 50,5 (22,9 %) | 0,00 | 0 | 136 g | 42,7 kg | 20,1, 11,5, 12,8 |

« Manquante » : un client qui voulait ce service, alors que plus aucun plat de ce service ne reste. Un plat seul peut manquer bien plus
souvent, le client en prend alors un autre. 25 % est le seul chiffre publié que j'aie trouvé (un éditeur de logiciels), et c'est aussi
la plus petite des marges essayées qui ne manque jamais sur ces 100 journées. Le dernier lot arrive au frigo vers 16 h, avant la mise en place de 16 h 30.

**Ce qui reste à la fin** est compté, puis étiqueté et rangé : le lendemain n'existe pas dans le modèle, donc rien ne dit encore ce que ces
restes deviennent (question 39). Les biodéchets par client tombent près du repère publié de 134 g, mais ce n'est pas une validation : le
modèle ne jette aucun reste, et ses quantités de déchets sont des hypothèses.

**Dans l'onglet**, le bilan dit ce qui était prévu, les lots de chaque plat, et ce qu'il en reste.

## Les mesures (étape 6)

`npm run journee -- 20`, 20 journées, 37 ms chacune sur la machine pleine ; le plan brouillon, 12 fourneaux et 6 fours :

| Mesure | Moyenne |
|---|---|
| clients, tables servies, assiettes | 115,3, 26,8, 171 |
| un bon : moyenne, 90ᵉ centile, pire | 9,5, 17,3, 25,8 min |
| bons en cours au pic | 8,6 |
| clients en salle au pic | 63,3 |
| temps à table | 86,9 min |
| carnet | 30 demandes, 6,0 refusées, 3,5 déplacées, 2,6 absentes |
| attente de sa table quand on a réservé | 0,2 min, 3,4 au pire |
| au bar sans réservation | 40,9 clients, 52 min, jusqu'à 30 debout ; 5,4 tables prises |
| production | 70,8 couverts prévus, 74,5 à table ; 218 portions, 46,7 restes, 0,00 manquantes |
| refroidissement le plus long | 80,9 min (limite : 120) |
| remise en état d'une table | 6,2 min |
| bar | 223 verres, une tournée 1,9 min, 6,7 au pire |
| déchets | 10,0 kg de biodéchets, 42,3 de cartons, 19,3 de verre, 5,7 d'ordures |
| biodéchets par client | 135 g (repère publié : 134) |
| sacs sortis, bacs qui ont débordé | 13,1, 1,0 |
| fermeture | vers minuit, 0 h 32 au plus tard |

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
