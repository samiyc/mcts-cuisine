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

- **Un plat par voyage** : au banquet, un vrai traiteur coupe en série (plusieurs portions d'un coup) et dresse à la
  chaîne ; le modèle fait un plat par voyage, de la caisse au passe. À 8 couverts et 30 tours au chaud, aucun envoi ne
  partait jamais (`docs/metiers.md`, « Le banquet »). Rangé : étape 2, un geste « en série » (couper N portions, plus
  long qu'une mais bien moins que N).
- **L'humain du banquet** : « au hasard », il fait mourir presque tous les envois de trois cuisines. L'humain « qui
  suit sa table » suit aussi le plan de production (il ne lance pas un plat qui mourrait au chaud) : à mesurer au
  banquet. Rangé : étape 2.

- **La livraison sans emballage ni enseignes** : le poste d'emballage (une lettre de plus dans les plans, une étape de
  plus à chaque plat) et les deux enseignes sous un toit ([livraison.md](livraison.md)) ne sont pas faits ; une règle
  qui tiendrait compte de l'incertitude des coursiers non plus (le rétroplanning ne lit que l'heure annoncée). Rangé :
  étape 3.
- **Les deux tirages du banquet et de la livraison sont des hypothèses** (6 couverts, 60 tours au chaud ; un coursier
  annoncé à 30 tours, à ±8, qui attend 10) : à revoir avec Sami, comme la patience et le rythme des commandes.

## Annoncés, pas encore faits

- **L'aboyeur qui réclame** ([brigade-service.md](brigade-service.md)) : le rôle `passe` en est l'ébauche. La réclame
  en règle (le plat dont les voisins attendent au passe d'abord) est mesurée le 26/10 : rien. Reste l'aboyeur en rôle,
  un robot au passe qui annonce et réclame aux autres. Rangé : étape 1.
- **La mise en place** : reportée par Sami (26/10) ; c'est le chantier des robots en avance (`docs/modele.md`, « La
  suite » 3) : une nouvelle décision pour les règles et la recherche (quoi préparer, combien), et trois cuisines sans
  comptoir pour la poser. Rangé : une étape à part, après les tables et la rupture.
- **Les humains simulés ignorent la rupture** : l'humain « qui suit sa table » est fait (26/10) ; aucun ne regarde
  le stock. Rangé : étape 1.
- **La recherche sur les tables et la rupture** : son évaluation compte les plats à temps ; avec les tables, c'est la
  table qui compte, et un plat mort au passe n'y pèse pas. Les mesures de nuit du 26/10 (`docs/metiers.md`) : elle
  fait avancer les tables dans la petite cuisine et la grande brigade, mais la règle de la table la bat dans le grand
  détour ; avec la rupture, elle gagne peu. Rangé : une évaluation par table, à mesurer.
- **La plonge, les allergènes, la fatigue, les menus en plusieurs temps** : prévus « plus tard » dans la
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
