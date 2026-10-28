# Les oublis

Sami (26/10/2026) : « Note les oublis dans les docs & changelog html ». Ce que les étapes 0 et 1 de la
[feuille de route](feuille-de-route.md) ont laissé de côté, ce qu'elles ont découvert en chemin, et ce que les
recherches ([glossaire.md](glossaire.md), [indicateurs.md](indicateurs.md)) annonçaient sans que ce soit fait. Chaque
point dit où il se rangera.

## Découverts en chemin

- **Les tables manquent de mains.** Avec deux robots et un cuisinier, une table de trois plats ne peut pas se faire en
  même temps ; ses plats arrivent au passe à 20 ou 30 tours d'écart, et le premier meurt avant le dernier. Marcher plus
  vite n'y change rien, il en meurt même davantage (les plats rapides arrivent plus tôt). Pistes, à mesurer :
  - ~~la règle « la table » compte les mains libres~~ : mesuré le 26/10, rien (+0,1 plat), pas gardé ;
  - **une patience par table**, proportionnelle à sa taille ;
  - **un passe chauffé** (une lampe) : le plat y tient plus longtemps, comme dans les vraies cuisines.
  Rangé : étape 1, à reprendre avec les mesures de nuit du 26/10 (la recherche sur les tables).
- **La rupture ne choisit pas à qui donner les derniers ingrédients.** Avec un stock serré, toutes les règles font
  pareil : la première commande prise vide la caisse. Une commande qui sera servie à temps vaut mieux qu'une qui sera en
  retard. Rangé : la recherche (étape 4 des urgences, ici après l'étape 3).
- **L'attente aux fourneaux de la cuisine coupée en deux** (70 tours par service, pour 26 % d'usage du plus chargé) :
  on la croyait due à des fourneaux réservés par des cuisiniers encore loin ; compté le 26/10, ils ne le sont que 11
  tours par service. La cause reste à trouver (la mesure d'attente elle-même, ou les marmites prêtes qui attendent
  d'être retirées). Rangé : étape 0.
- **L'impasse du passe** : dans la cuisine en couloir, les deux passes sont au fond d'une impasse et l'attente reste
  (18 à 25 tours par service). Un plan à revoir, si Sami le veut.

- **L'humain du banquet** : « au hasard », il fait mourir presque tous les envois de trois cuisines. L'humain « qui
  suit sa table » suit aussi le plan de production (il ne lance pas un plat qui mourrait au chaud) : à mesurer au
  banquet. Rangé : étape 2.

- **La livraison sans enseignes** : les deux enseignes sous un toit ([livraison.md](livraison.md)) ne sont pas faites ; une règle
  qui tiendrait compte de l'incertitude des coursiers non plus (le rétroplanning ne lit que l'heure annoncée). Rangé :
  étape 3.
- **Les deux tirages du banquet et de la livraison sont des hypothèses** (6 couverts, 60 tours au chaud ; un coursier
  annoncé à 30 tours, à ±8, qui attend 10) : à revoir avec Sami, comme la patience et le rythme des commandes.

## Annoncés, pas encore faits

- **La mise en place, une décision** : faite le 26/10 comme une habitude fixe (un robot sans commande coupe une soupe
  d'avance) ; quoi préparer et combien n'est pas encore un choix des règles ni de la recherche. Les trois cuisines sans
  comptoir n'en ont pas. Rangé : les robots en avance (`docs/modele.md`, « La suite » 3).
- **L'aboyeur sans comptoir** : dans la grande brigade, personne ne lui apporte de plat ; il faudrait qu'on lui tende
  le plat au passe (un relais par le passe). Et un humain qui lui obéit. Rangé : étape 1.
- **Les humains simulés ignorent la rupture** : l'humain « qui suit sa table » est fait (26/10) ; aucun ne regarde
  le stock. Rangé : étape 1.
- **La recherche sur les tables et la rupture** : son évaluation compte les plats à temps ; avec les tables, c'est la
  table qui compte, et un plat mort au passe n'y pèse pas. Les mesures de nuit du 26/10 (`docs/metiers.md`) : elle
  fait avancer les tables dans la petite cuisine et la grande brigade, mais la règle de la table la bat dans le grand
  détour ; avec la rupture, elle gagne peu. Rangé : une évaluation par table, à mesurer.
- **Les menus en plusieurs temps** (entrée, plat, dessert pour une même table) : prévus dans la
  [feuille de route](feuille-de-route.md), étape 4.

## Fait depuis

Les oublis réglés quittent cette liste et vont dans [modele.md](../modele.md) ou [metiers.md](../metiers.md) avec leurs mesures.

- **Les mesures d'avant le 26/10**, au pas 1 avec un seul passe : refaites la nuit du 26/10 (« Les mesures de nuit
  du 26/10 »).
- **La recherche au banquet ne voyait pas l'heure d'envoi et ne savait pas attendre** (trouvé par ces mesures) :
  ses mondes vont jusqu'au dernier envoi, attendre est un de ses coups, et sa liste courte commence par le choix de
  la règle de ses mondes.
- **L'humain « qui suit sa table »** (26/10) : il aide dans cinq cuisines sur sept (`docs/metiers.md`).
- **La recherche qui attend**, au banquet, à la livraison et avec les tables (26/10).
- **Les trois derniers indicateurs de l'étape 0** (26/10) : la courbe du service, les plats par cuisinier, le temps
  réservé sans travailler.
- **L'aboyeur et la mise en place** (26/10, le soir) : faits, éteints par défaut, mesurés (`docs/metiers.md`).
- **Un plat par voyage** (26/10, le soir) : la coupe en série ; à 8 couverts et 30 tours au chaud, le banquet part enfin
  (`docs/metiers.md`, « La coupe en série »). Reste : quand lancer un lot, et de quelle taille (la recherche, dans la file).
- **Le poste d'emballage** (26/10, le soir) : la lettre `E`, la dark kitchen (`docs/metiers.md`). Ce qu'il évite (les
  erreurs de commande) n'est pas modélisé.
- **La plonge** (26/10, le soir) : les assiettes comptées, l'évier `L`, le rôle `plonge` (`docs/metiers.md`). Reste : laver par
  paniers pleins plutôt qu'une assiette à la fois.
- **Les allergènes et le ménage** (26/10, le soir) : les planches qui se souviennent, une salade sur dix « sans oignon »
  (`docs/metiers.md`). Reste : une cuisine à une planche, plusieurs allergènes, le code couleur des planches.
- **Les pauses, la fatigue, les erreurs de l'humain, les pannes des robots** (26/10, le soir) : `docs/metiers.md`.
- **Le robot qui barrait le fourneau, le relais oublié** (26/10, la nuit, trouvé par Sami dans la cuisine coupée en
  deux) : un robot qui surveillait sa marmite restait devant le fourneau quand un autre venait la retirer ; une soupe
  rouverte gardait la marque de son relais et ne pouvait plus repasser par un comptoir. Corrigés ; toutes les
  cuisines y gagnent, les mesures du soir sont refaites (`docs/mesures-27-10.md`).
- **La référence après la correction** (27/10) : mesurée (`night-reference.json`, `night-complements.json`), avec la
  rupture et les tables de la grande brigade ; les résultats sont dans `docs/mesures-27-10.md`. Restent ouverts : ce
  que coûte l'emballage (la dark kitchen n'a pas de service à la carte du même plan sans livraison), pourquoi la mise
  en place coûte deux plats au grand détour (une hypothèse, à vérifier sur un replay), et la mise en place de la
  coupée en deux, qui n'a pas été remesurée.
- **Deux cuisiniers sur une case** (27/10, lu dans les traces de la file : des cases réservées deux fois hors de la
  recherche) : un robot qui s'arrête où il est (`holdHere` : en panne, son plat parti, sa place cédée) gardait sa case
  pour de bon, sans voir qu'un autre devait y passer deux pas plus tard ; les deux se retrouvaient dessus. Une fois
  sur 600 services environ (14 sur 9 000, règles seules). Corrigé : ceux qui devaient y passer replanifient, comme
  autour du chef au clavier. 35 services sur 9 000 changent, 75 158 plats à temps avant, 75 154 après ; plus aucune
  case réservée deux fois (`tests/overlap.test.js`).
- **A* qui cherchait jusqu'à son horizon** (27/10) : en couloir, un appel sur deux ne trouvait pas de chemin, la cible
  murée par un cuisinier garé. `mcts-commun` s'arrête maintenant dès qu'elle est hors d'atteinte : A* 14 fois plus
  rapide en couloir, deux fois au grand détour, les mêmes résultats.
- **La table dont les plats meurent l'un après l'autre** (28/10, ouvert, vu à la main en préparant le palier) : un
  service des tables de la grande brigade, la recherche à 224 itérations ou plus. Une seule décision du tour 45
  diffère de 192 itérations, puis les trois soupes de la table 3 arrivent au passe une à une, à plus de 10 tours
  d'écart : chacune y meurt, est refaite, et meurt encore, sept fois. 8 plats à temps au lieu de 19, 12 morts au
  passe au lieu de 0. Rien ne remet en phase une table dont un plat est déjà mort : les autres partent au passe dès
  qu'ils sont prêts. Les paires du palier (`essais-palier.json`) diront ce que ça pèse sur 30 services ; une piste,
  à décider avec Sami : ne pas envoyer au passe le plat d'une table qui ne pourra pas être complète avant qu'il meure.
