# Les métiers de la cuisine dans le modèle (26/10/2026)

La suite de [modele.md](modele.md) : les étapes de la [feuille de route des métiers](recherche/feuille-de-route.md),
faites et mesurées le 26/10 (les tables, le passe et la rupture ; marcher plus vite ; le banquet ; la livraison ; les
mesures de nuit ; l'humain qui suit sa table ; les derniers indicateurs). Ce qui manque est dans
[recherche/oublis.md](recherche/oublis.md).

**Les chiffres de ce journal sont d'avant la correction du 26/10 au soir** (le robot qui barrait le fourneau, en fin
de fichier) : elle a supprimé la plupart des soupes brûlées. Les mesures refaites sur le code corrigé sont dans
[mesures-27-10.md](mesures-27-10.md).

## Les tables, le passe et la rupture (26/10, étape 1 de la feuille de route des métiers)

Les choix de Sami (26/10) : une table est **un groupe de commandes** ; un plat attend sa table **10 tours** au passe,
puis il est perdu et refait ; une caisse vide fait **refuser** les commandes de son plat ; la mise en place est
**reportée** (c'est le chantier des robots en avance, « La suite » 3). Deux réglages, éteints par défaut : les
services sans eux ont les mêmes journaux qu'avant.

**Les tables** (`setup.tables`, `src/service-tables.js`) :
- une table commande 2 ou 3 plats à la fois, chacun une commande avec le numéro de la table et son échéance ; les
  tables arrivent au rythme de la cuisine divisé par leur taille moyenne, pour garder à peu près autant de plats
  (hypothèse) ;
- un plat fini va **au passe** et y attend sa table ; la table part entière, quand son dernier plat arrive ; un plat
  qui attend plus de 10 tours **meurt au passe** et sa commande revient à faire (« à la volée ») ;
- la recherche imagine des tables dans ses mondes et les joue avec la règle de la table ;
- **une règle simple de plus, « la table »** (faire marcher) : la table la plus ancienne, son plat le plus long
  d'abord ; un plat ne part que si ce qui reste aux autres plats de sa table ne dépasse pas son propre travail de plus
  de 4 tours (hypothèse). Sans tables, elle revient à « la plus ancienne ».

**Ce qu'elles donnent** (30 services, le cuisinier « le plus urgent ») : **presque aucune table ne part à temps.**
Petite cuisine, tables de 2 ou 3, passe à 10 tours : 0,5 à 1 table sur 8,3 à temps, 10 à 13 plats morts au passe, 1 à
2 plats à temps au lieu de 12 sans tables. Même avec 40 tours au passe et des tables de deux, au mieux un tiers des
tables part à temps (3,3 sur 11,1), et les plats à temps tombent de 12-16 à 4-8. La règle de la table fait mourir moins
de plats (souvent deux fois moins) mais ne sert pas plus de tables à temps, sauf dans le grand détour (+0,8 plat).

Ce n'est pas un bug, c'est **l'échelle de temps du modèle** : une salade met 25 tours de la commande au passe, dont 4
de coupe et le reste à marcher ; une soupe 40 à 50. Avec deux robots, une table de trois soupes ne peut pas se faire en
même temps : ses plats arrivent forcément à 20 ou 30 tours d'écart, et la table attend le plus lent. Les 60 tours de
patience, faits pour un plat, ne suffisent pas à une table. Un tour vaut une case de marche comme une minute de
coupe : la marche est bien trop lente devant le travail. C'est la question posée à Sami avant d'aller plus loin.

**La rupture** (`setup.supply`, `src/service-supply.js`) :
- chaque caisse a un stock pour le service ; un plat prend son ingrédient quand un cuisinier prend sa commande à faire
  depuis la caisse (personne ne marche vers une caisse vide), une préparation d'avance aussi ;
- la caisse vide, le plat est retiré (le 86) : ses commandes ouvertes, celles qui arrivent, et une soupe brûlée ou un
  plat mort à refaire sont **refusés**, comptés à part ; une table part sans son plat refusé ; le chef au clavier
  trouve la caisse vide ;
- les mondes de la recherche ont leur propre compte.

**Ce qu'elle donne** (30 services) : les refusées remplacent les manquées (il n'en reste presque plus). Avec 4
ingrédients par caisse, les trois règles font exactement pareil : le stock décide de tout (petite : 12 refusées sur
20, 7,5 à temps). Avec 8, le plat le plus rapide reprend son avance (+0,9 dans la petite, +1,5 dans la grande
brigade). Aucune règle ne choisit encore **à qui donner les derniers oignons** : une commande qui sera servie à temps
plutôt qu'une qui sera en retard. C'est une décision pour la recherche.

Les deux réglages sont dans l'onglet Cuisine, et `npm run compare -- --tables --rupture [n]`.

## Marcher plus vite, deux cases de passe (26/10, Sami)

Sami : d'accord pour **marcher plus vite**, du moment qu'on évite les superpositions ; **deux cases de passe** pour
limiter la congestion.

- **L'allure** (`setup.pace`, `src/service-legs.js`) : un tour compte `pace` pas, un pas une case. Les chemins sont
  réservés pas à pas dans le moteur de mcts-commun : personne ne partage une case ni ne se croise, à aucun pas (un test
  le vérifie pas à pas sur les sept cuisines, à 2 et 3 cases par tour). Le travail (couper, cuire, servir) reste en
  tours ; les seuils qui comparaient des cases à des tours (arriver avant que la soupe brûle, les relais, rendre sa
  place, le poste le plus proche) divisent les cases par l'allure. Le chef au clavier fait autant de pas qu'un robot :
  ses touches remplissent un tour (`pace` pas, ou un E). À `pace` 1, tout est identique à avant (les empreintes).
- **Les deux passes** : un second `S` contre le premier dans les six plans qui n'en avaient qu'un (la grande brigade en
  avait déjà deux), devant une case de sol libre. Les replays gardés rejouent leur plan d'origine.
- **Par défaut : 2 cases par tour** dans toutes les cuisines (`PACE`, `src/kitchens.js`), réglable dans l'onglet
  Cuisine. Les empreintes des règles, des variantes et de la recherche changent ; celle du replay de Sami non.

Mesures (30 services, le cuisinier « le plus urgent », avec les deux passes) : plats à temps avec le plat le plus
rapide, et tables à temps avec la règle de la table :

| Cuisine | pas 1 | pas 2 | pas 3 | pas 4 | attente au passe (pas 1 → 2) | tables à temps, pas 1 → 2 → 4 |
|---|---|---|---|---|---|---|
| petite | 12,6 / 19,9 | 16,9 | 18,4 | 19,0 | 0,7 → 0,0 | 0,8 → 1,5 → 3,0 sur 8,3 |
| en couloir | 5,7 / 13,3 | 8,6 | 10,3 | 10,3 | 18,1 → 25,5 | 0,4 → 0,2 → 0,5 sur 5,8 |
| grande brigade | 16,2 / 34,3 | 25,0 | 29,0 | 31,2 | 29,6 → 12,3 | 0,8 → 2,2 → 5,9 sur 14,3 |
| passe-plats | 7,1 / 15,3 | 11,3 | 13,4 | 13,4 | 0,9 → 1,5 | 0,5 → 1,1 → 1,5 sur 6,5 |
| postes | 8,9 / 19,9 | 13,6 | 14,9 | 17,0 | 0,3 → 0,7 | 0,7 → 0,8 → 1,6 sur 8,3 |
| coupée en deux | 10,4 / 19,9 | 12,0 | 13,1 | 13,4 | 0 → 0 | 0,6 → 1,1 → 1,5 sur 8,3 |
| le grand détour | 7,5 / 19,9 | 15,4 | 17,2 | 18,2 | 0 → 0 | 0,9 → 3,3 → 4,2 sur 8,3 |

- **La seconde case de passe** fait disparaître l'attente au passe dans la petite cuisine (27,9 tours par service →
  0,7), mais ne sert pas un plat de plus au pas 1 : la marche bornait tout. Dans la cuisine en couloir, l'attente reste
  (les deux passes sont au fond d'une impasse) ; dans la grande brigade, cinq cuisiniers pour deux passes, elle baisse
  quand on marche plus vite.
- **Marcher plus vite libère la cuisine** : au pas 2, la petite cuisine sert 85 % des plats à temps, la grande brigade
  73 % (au lieu de 63 % et 47 %). Au pas 3 ou 4, presque tout part à temps : il ne resterait rien à départager entre
  les règles et la recherche. D'où **2** par défaut.
- **Les tables restent ratées à toute allure**, et il meurt même plus de plats au passe quand on marche vite (les plats
  rapides arrivent plus tôt et attendent leurs voisins). Le problème des tables est le nombre de mains, pas la marche :
  voir [`recherche/oublis.md`](recherche/oublis.md).

Toutes les mesures d'avant ce jour (la recherche, les mesures de nuit) étaient au pas 1 avec un passe : elles sont à
refaire.

## Le banquet (26/10, étape 2 de la feuille de route des métiers)

Sami (26/10) : « continue sur les étapes suivantes ». Le banquet (`setup.banquet`, `src/service-banquet.js`,
[`recherche/traiteur.md`](recherche/traiteur.md)) :
- **les commandes sont connues dès le début** : environ 6 couverts (5 à 7, tirés de la graine), une entrée (salade)
  envoyée vers le tour 70, un plat (soupe) vers le tour 130, chaque envoi tiré à ±10 tours de son heure : un traiteur
  ne fait jamais deux fois le même banquet, et les services d'une mesure ne sont pas tous le même ;
- **un plat prêt attend au chaud** (l'étuve : le passe), 60 tours au plus, sinon il est perdu et refait ; un envoi part
  **entier, à son heure et pas avant**, à temps jusqu'à 5 tours après ; c'est la mécanique des tables, un envoi est une
  table qui attend son tour ;
- **la recherche n'a rien à tirer** : toutes les commandes sont connues ; le seul caché est l'humain ;
- **une règle simple de plus, « le rétroplanning »** : le plat dont le début au plus tard (son envoi, moins son
  travail, moins 10 tours de marge, une hypothèse) est le plus proche ; un plat de banquet n'est pas lancé s'il devait
  attendre au chaud plus que l'étuve ne tient. Sans banquet, c'est la commande qui a le moins de marge. La recherche
  joue ses mondes avec elle au banquet.

**Le premier calibrage a échoué** : à 8 couverts et 30 tours au chaud, aucune cuisine n'envoyait jamais une entrée.
Dans la petite cuisine, une salade fait 14 tours de la caisse au passe pour un robot : deux robots en sortent une tous
les 7 tours, soit 56 tours pour 8 salades, et les premières meurent avant que les dernières arrivent. Un vrai traiteur
coupe **en série**, plusieurs portions à la fois ; le modèle fait un plat par voyage (un oubli, `recherche/oublis.md`).
D'où 6 couverts et 60 tours.

**Ce qu'il donne** (20 banquets par cuisine ; envois à l'heure sur 2, et plats perdus au chaud, pour la plus ancienne
/ le plat le plus rapide / la table / le rétroplanning) :

| Cuisine | sans humain | le cuisinier « le plus urgent » |
|---|---|---|
| petite | 0,9 / 0,9 / 0,9 / 1,0 (perdus 5,0 / 5,2 / 1,9 / 1,6) | 0,9 / 0,9 / 0,9 / 0,8 |
| en couloir | 0 partout (8 perdus) | 0,9 partout ; perdus 4 / 4 / 0,9 / 0,6 |
| grande brigade | 0,9 / 0,9 / 1,1 / **1,3** | 0,9 partout |
| passe-plats | 0 / 0 / 0 / **0,5** | 0,3 / 0,3 / 0,3 / **0,9** |
| postes | 0 partout | 0,6 / 0,6 / 0,3 / **0,8** |
| coupée en deux | 0,5 partout | 0,8 partout |
| le grand détour | 0,6 partout | 1,1 / 1,1 / **1,6** / 1,1 (la table : aucun perdu) |

- **Le banquet départage les règles**, ce que le service à la carte au pas 2 ne fait presque plus : le rétroplanning
  l'emporte dans le passe-plats, la grande brigade et « postes », la règle de la table dans le grand détour.
- **Sans humain, c'est parfois pire** : dans la cuisine en couloir, aucun envoi sans le cuisinier, qui apporte des
  mains. Avec le cuisinier « au hasard », presque rien ne part dans trois cuisines (en couloir, passe-plats, postes :
  0,1 à 0,2 envoi sur 2) : il lance des plats à n'importe quel moment, et ils meurent au chaud.
  L'humain qui ne suit pas le plan de production est l'obstacle, et les robots ne le commandent pas : c'est là que
  la recherche, qui imagine ce qu'il va faire, a quelque chose à gagner.
- **La soupe est l'envoi difficile** : deux fourneaux pour six marmites, elles sortent en vagues ; la première attend
  la dernière au chaud (à mesurer : l'attente au chaud par envoi).

Dans l'onglet Cuisine (« Un banquet »), et `npm run compare -- --banquet`.

## La livraison (26/10, étape 3 de la feuille de route des métiers)

La dark kitchen (`setup.delivery`, `src/service-delivery.js`, [`recherche/livraison.md`](recherche/livraison.md)) :
- **chaque commande a son coursier** : la plateforme l'annonce 30 tours après la commande (`sendAt`, connu de tous) ;
  il vient en vrai à ±8 tours de l'annonce (`courierAt`), **ce que personne ne sait avant qu'il soit là** ;
- un plat fini attend son coursier au passe, 15 tours au plus (il refroidit, il est refait) ; **le coursier attend son
  plat 10 tours au plus**, puis repart sans lui : la commande est « partie » ; c'est la mécanique des tables, une
  commande est une table d'un plat, envoyée quand son coursier est là ;
- **la recherche retire, dans chacun de ses mondes, l'heure des coursiers pas encore venus** autour de leur annonce :
  c'est le caché propre à la livraison ; elle joue ses mondes avec le rétroplanning ;
- les commandes elles-mêmes sont celles du service à la carte (le même tirage), les coursiers d'un tirage à part ;
- le poste d'emballage est reporté (`recherche/oublis.md`). Les chiffres sont des hypothèses.

**Un bug trouvé en mesurant** : le coursier repartait pendant qu'un cuisinier finissait son plat ; le cuisinier le
posait au passe, et il partait vers un coursier absent (des attentes de coursier de 16 à 25 tours pour 10 permis).
Quand le coursier repart, tout ce qui tient sa commande est abandonné : le cuisinier (libre, son poste lâché), sa
marmite, son plat sur un comptoir ; et le coursier part avant les envois du tour. Un test le vérifie tour par tour.

**Ce qu'elle donne** (20 services, le cuisinier « le plus urgent ») : plats à temps sans livraison (plat le plus
rapide), puis avec, pour la plus ancienne / le plat le plus rapide / le rétroplanning, et les commandes parties sans
leur plat :

| Cuisine | sans livraison | la plus ancienne | le plus rapide | le rétroplanning | gain du rétroplanning sur la plus ancienne |
|---|---|---|---|---|---|
| petite | 17,5 / 20,7 | 13,4 (7,0 parties) | **13,9** (6,5) | 13,2 (7,3) | −0,30 (−1,14 à 0,54) |
| en couloir | 8,9 / 14,1 | 5,0 (8,8) | **5,4** (8,3) | 4,8 (8,9) | −0,20 |
| grande brigade | 25,6 / 34,4 | 18,8 (15,3) | **21,3** (12,8) | 18,4 (15,7) | −0,40 |
| passe-plats | 12,2 / 15,8 | 9,3 (6,5) | **9,5** (6,3) | 9,2 (6,6) | −0,15 |
| postes | 14,6 / 20,7 | **12,8** (7,7) | 12,1 (8,4) | 12,0 (8,5) | −0,75 |
| coupée en deux | 12,6 / 20,7 | 11,1 (9,3) | **11,3** (9,0) | 10,8 (9,7) | −0,30 |
| le grand détour | 15,6 / 20,7 | 10,8 (9,7) | **11,4** (9,0) | 10,1 (10,3) | −0,70 (−1,32 à −0,08) |

- **Un tiers des commandes part sans son plat** : le coursier n'attend que 10 tours, et la cuisine ne sait pas quand il
  vient ; les coursiers attendent en moyenne 2 à 3 tours un plat servi.
- **Suivre l'heure annoncée n'aide pas** : le rétroplanning fait un peu moins bien que la plus ancienne commande
  (significatif dans le grand détour). L'annonce n'apprend rien de plus que l'heure de la commande (elle en est
  toujours à 30 tours) et se trompe de ±8 tours ; c'est ce caché que la recherche imagine, à mesurer la nuit.

## Les mesures de nuit du 26/10 (deux cases par tour, deux passes)

`night.json`, 22 mesures sur 18 fils (mcts-backlog), de 13 h 09 à 14 h 56 : la recherche contre les règles,
aux réglages par défaut, 50 services par cuisine et par humain ; 30 pour les tables, la rupture, le banquet et la
livraison. Le gain se lit, par paires, contre la plus ancienne commande ; l'écart à la meilleure règle est la
différence de deux gains, sans son intervalle.

**Le service à la carte** (plats à temps : la plus ancienne / le plat le plus rapide / la recherche) :

| Cuisine | le cuisinier « le plus urgent » | gain de la recherche | « au hasard » | sans humain |
|---|---|---|---|---|
| petite | 17,2 / 17,0 / **17,8** | +0,66 (0,27 à 1,05) | 16,2 / 16,3 / **17,5** | 12,2 / 13,4 / **15,7** |
| en couloir | 8,8 / 9,1 / **9,6** | +0,80 (0,40 à 1,20) | 6,1 / 7,9 / **8,3** | 5,1 / 7,4 / **8,2** |
| grande brigade | 23,3 / 24,9 / **28,4** | +5,02 (3,71 à 6,33) | 22,1 / 24,5 / **28,0** | 17,6 / 22,1 / **25,7** |
| passe-plats | 11,5 / 11,6 / **12,1** | +0,60 (0,17 à 1,03) | 11,1 / 11,4 / **12,1** | 7,1 / 7,7 / **10,1** |
| postes | 13,7 / 14,1 / **15,7** | +1,98 (1,23 à 2,73) | 13,3 / 14,0 / **15,4** | 8,3 / 8,6 / **11,7** |
| coupée en deux | 13,9 / 13,2 / **15,3** | +1,42 (0,86 à 1,98) | 13,9 / 13,4 / **15,0** | 6,5 / 10,6 / **11,9** |
| le grand détour | 15,2 / 15,9 / **17,1** | +1,88 (1,08 à 2,68) | 11,6 / 13,9 / **15,2** | 5,2 / 9,8 / **10,7** |

- **La recherche bat toutes les règles, dans les sept cuisines, avec chaque humain et sans humain** ; son gain sur la
  plus ancienne est significatif partout. Au pas 1 (23/10), elle n'était qu'au niveau de la meilleure règle dans
  plusieurs cuisines : marcher plus vite laisse plus de choix à faire.
- **La grande brigade** est là où elle gagne le plus : +5 plats à temps sur 34 avec un humain, +8 sans ; le bon au
  9e décile passe de 61 à 54 tours. Quatre robots, c'est quatre choix qui se gênent ou s'aident.
- La règle « la table » sans tables est la plus ancienne : mêmes chiffres, gain 0.

**Les tables** (30 services, le cuisinier « le plus urgent » ; plats à temps, tables à temps, plats morts au passe) :

| Cuisine | la plus ancienne | le plus rapide | la table | la recherche |
|---|---|---|---|---|
| petite | 4,1 ; 1,9 / 8,3 ; 12,4 | 3,1 ; 1,5 ; 18,5 | 3,2 ; 1,5 ; 13,1 | **6,3 ; 2,7** ; 13,7 |
| grande brigade | 4,4 ; 2,0 / 14,3 ; 19,4 | 4,3 ; 2,0 ; 27,5 | 5,1 ; 2,2 ; 17,5 | **6,9 ; 3,1** ; 22,8 |
| le grand détour | 3,5 ; 1,5 / 8,3 ; 9,4 | 3,0 ; 1,3 ; 11,3 | **7,7 ; 3,3 ; 3,2** | 4,1 ; 1,7 ; 10,0 |

- **La recherche fait avancer les tables** dans la petite cuisine et la grande brigade (+2,2 et +2,5 plats à temps,
  une table de plus), mais elles restent ratées : un tiers des tables à temps au mieux.
- **Dans le grand détour, la règle de la table bat la recherche** (+4,2 contre +0,6) : elle retient les plats qui
  attendraient leurs voisins (3 morts au passe au lieu de 10). La recherche ne l'avait pas dans sa liste courte (le
  plat le plus rapide, la plus ancienne, la caisse la plus proche) : elle jouait ses mondes avec elle, sans jamais
  pouvoir la choisir.

**La rupture** (8 ingrédients par caisse) : la recherche gagne peu avec un humain (+0,1 à +0,7, significatif dans la
grande brigade et avec le cuisinier « au hasard »), +2,3 et +1,3 sans humain ; elle refuse à peine moins de commandes
(19,6 au lieu de 20,1 dans la grande brigade). Elle ne choisit pas encore à qui donner les derniers ingrédients.

**La livraison** (le cuisinier « le plus urgent » ; plats à temps, commandes parties sans leur plat : la plus ancienne /
le plus rapide / le rétroplanning / la recherche) :

| Cuisine | à temps | parties | gain de la recherche | sans humain, à temps |
|---|---|---|---|---|
| petite | 13,1 / 13,3 / 13,0 / **14,1** | 6,6 / 6,4 / 6,6 / **5,6** | +1,00 (0,46 à 1,54) | 8,5 / 11,2 / 7,3 / **12,4** |
| grande brigade | 18,1 / 20,4 / 17,7 / **21,7** | 15,8 / 13,6 / 16,2 / **12,3** | +3,67 (2,50 à 4,83) | 14,0 / 18,7 / 12,9 / **20,5** |
| passe-plats | 8,8 / 8,9 / 8,7 / 8,8 | 6,3 / 6,2 / 6,4 / 6,3 | 0,00 (−0,38 à 0,38) | 5,0 / 5,7 / 4,9 / **6,8** |
| postes | 11,7 / 11,4 / 11,0 / **12,1** | 8,0 / 8,3 / 8,7 / **7,6** | +0,43 (−0,21 à 1,08) | 6,2 / 6,7 / 5,9 / **8,4** |
| le grand détour | 10,7 / 11,2 / 10,1 / **12,5** | 8,9 / 8,4 / 9,6 / **7,1** | +1,83 (0,96 à 2,71) | 4,6 / 7,8 / 3,7 / **8,9** |

- **Imaginer les coursiers paie** : la recherche, qui retire leur heure dans chaque monde, perd moins de commandes
  que toutes les règles, alors qu'elle joue ses mondes avec la pire d'entre elles (le rétroplanning).

**Le banquet : la recherche ne voyait pas l'heure d'envoi.** Dans trois cuisines sur cinq, elle faisait exactement ce
que fait le plat le plus rapide (gain 0,00, de 0,00 à 0,00) ; dans le passe-plats, le rétroplanning gagnait +3,3 et
elle +0,1. Deux raisons, corrigées le soir même (`src/search.js`) :
- ses mondes s'arrêtaient 60 tours plus loin ; au début du service, aucun envoi n'est encore dû, chaque plat y vaut
  « encore à temps », et tous les choix se valent. Au banquet, un monde va maintenant jusqu'au dernier envoi ;
- **elle ne savait pas attendre** : le rétroplanning gagne en ne lançant pas un plat qui mourrait au chaud, la
  recherche lançait toujours quelque chose. Au banquet et à la livraison, attendre est maintenant un de ses coups.
Et sa liste courte commence par le choix de la règle de ses mondes (la table, le rétroplanning) : ce que la règle
ferait, elle peut toujours le faire. Sans tables, banquet ni livraison, rien ne change (les empreintes).

**Remesuré** (30 services, mêmes services ; le cuisinier « le plus urgent » ; plats à temps, envois à l'heure sur 2) :

| Banquet | la plus ancienne | la meilleure règle | la recherche, avant | la recherche, maintenant |
|---|---|---|---|---|
| petite | 5,0 ; 0,8 | 5,0 (toutes) | 5,0 ; 0,8 | **9,2 ; 1,6** (+4,20, de 2,96 à 5,44) |
| passe-plats | 1,6 ; 0,3 | 4,9 ; 0,8 (le rétroplanning) | 1,7 ; 0,3 | **7,5 ; 1,3** (+5,93) |
| postes | 3,4 ; 0,6 | 4,7 ; 0,8 (le rétroplanning) | 3,8 ; 0,7 | **9,0 ; 1,6** (+5,60) |

| Livraison | la meilleure règle | la recherche, avant | maintenant | commandes parties (maintenant) |
|---|---|---|---|---|
| petite | 13,3 (le plus rapide) | 14,1 | **14,3** | 5,4 |
| passe-plats | 8,9 (le plus rapide) | 8,8 | **9,7** | 5,4 |
| postes | 11,7 (la plus ancienne) | 12,1 | **12,4** | 7,3 |
| le grand détour | 11,2 (le plus rapide) | 12,5 | **13,1** | 6,7 |

- **Au banquet, la recherche est maintenant de loin la meilleure** : deux fois plus de plats à temps que la meilleure
  règle, le retard maximal d'un envoi divisé par deux (26 à 43 tours au lieu de 66 à 72). Savoir attendre et voir
  jusqu'à l'envoi, c'est tout le rétroplanning, mais en imaginant aussi ce que fera le cuisinier.
- **À la livraison**, elle gagne un peu plus qu'avant, et maintenant aussi dans le passe-plats.
- La grande brigade et le grand détour au banquet, la grande brigade à la livraison : encore en cours (des mondes
  jusqu'au dernier envoi coûtent cher).
- **Avec le cuisinier qui suit le plan** (il ne lance pas un plat qui mourrait au chaud, 30 services) : les règles vont
  mieux, le rétroplanning surtout (petite 6,3 au lieu de 4,7 avec « le plus urgent » ; passe-plats 5,5 au lieu de 4,9 ;
  postes 6,1 au lieu de 4,7) ; la recherche reste où elle était (9,1 ; 7,6 ; 9,0). Un humain qui suit le plan aide les
  robots qui ne savent pas l'imaginer ; la recherche, elle, l'imaginait déjà.

## L'humain qui suit sa table, les mains comptées (26/10, le soir, suite de l'étape 1)

Sami (26/10) : d'accord pour finir l'étape 1 par un humain « qui suit sa table » et une règle qui compte les mains.

**Le cuisinier qui suit sa table** (`HUMANS.table`, `src/rules.js`) : la table la plus ancienne, son plat le plus long
d'abord ; au banquet et pour un coursier, il ne lance pas un plat qui attendrait trop au passe (il attend, comme le dit
le plan de production). Sans tables, c'est la plus ancienne commande : il n'est donc proposé qu'aux services qui ont
des tables (`humansOf` : les tables, le banquet, la livraison), et la recherche ne l'imagine que là. Les services sans
tables sont inchangés (les empreintes, qui ne prennent que les humains de chaque service).

Avec lui (30 services, tables ; plats à temps avec la meilleure règle de chaque cuisine, comparés au cuisinier
« le plus urgent ») :

| Cuisine | « le plus urgent » | « suit sa table » |
|---|---|---|
| petite | 4,3 (le rétroplanning) | **5,5** (le rétroplanning) |
| en couloir | 0,5 | 0,7 |
| grande brigade | 5,1 (la table) | **5,5** (la table) |
| passe-plats | 2,4 (la table) | **3,1** (la table) |
| postes | 1,9 (le rétroplanning) | **3,1** (le rétroplanning) |
| coupée en deux | 2,5 (le plus rapide) | 2,5 (le plus rapide) |
| le grand détour | **7,7** (la table) | 5,4 (la table) |

Un humain qui suit sa table aide dans cinq cuisines sur sept, perd dans le grand détour, et ne sauve pas les tables :
un tiers d'entre elles à temps au mieux.

**Compter les mains : mesuré, pas gardé.** La règle de la table a appris qui fera les voisins d'un plat et quand :
chaque autre cuisinier libre maintenant, ou à la fin de son plat, prend le voisin le plus long d'abord. Sur les sept
cuisines et les quatre humains, 30 services, l'écart sur les plats à temps va de −0,6 à +0,7, **+0,1 en moyenne** : rien.
Avec ces deux recettes (une soupe de 11 tours, une salade de 4), la règle retenait déjà la salade tant que la soupe
n'était pas coupée ; les mains ne changent la décision que rarement. La règle simple reste ; la mesure est notée dans
son commentaire.

**La recherche attend aussi avec les tables.** Le coup « attendre » du banquet (plus haut) sert aussi aux tables : la
règle de la table bat la recherche dans le grand détour parce qu'elle retient les plats qui mourraient au passe. Avec
lui, premier essai (10 services, le grand détour, le cuisinier « le plus urgent ») : la recherche **9,6** plats à temps,
la règle de la table 5,9, la plus ancienne 3,6 ; **3,9 tables sur 8,1 à temps** (la table : 2,5), 2,6 plats morts au
passe (la table : 4,7). Le meilleur résultat des tables jusqu'ici, à confirmer par les mesures de nuit.

Mesuré (30 services, la petite cuisine ; plats à temps, tables à temps sur 8,3, plats morts au passe ; la meilleure
règle, la recherche des mesures de nuit, la recherche qui attend) :

| Le cuisinier | la meilleure règle | la recherche, la nuit | la recherche qui attend |
|---|---|---|---|
| « le plus proche » | 3,9 ; 1,8 ; 14,2 (la plus ancienne) | 6,2 ; 2,7 ; 15,5 | 5,9 ; 2,6 ; 11,7 |
| « le plus urgent » | 4,3 ; 1,9 ; 11,7 (le rétroplanning) | 6,3 ; 2,7 ; 13,7 | **7,5 ; 3,2 ; 9,3** (+3,40, de 2,04 à 4,76) |
| « au hasard » | 4,0 ; 1,8 ; 11,8 (le rétroplanning) | 5,6 ; 2,5 ; 14,7 | **6,3 ; 2,7 ; 9,8** |
| « suit sa table » | 5,5 ; 2,4 ; 10,1 (le rétroplanning) | — | **8,3 ; 3,5 ; 8,2** |
| sans humain | 2,2 ; 1,0 ; 7,6 (le rétroplanning) | 4,0 ; 1,8 ; 14,2 | **4,4 ; 1,9 ; 6,1** |

- **Attendre fait mourir moins de plats au passe** (un tiers de moins) et sert plus de tables, sauf avec le cuisinier
  « le plus proche », où c'est égal.
- **Le meilleur service des tables** : la recherche qui attend avec le cuisinier qui suit sa table, 3,5 tables sur 8,3
  à temps. Les tables restent difficiles : il en part moins de la moitié à temps.

Ailleurs (30 services ; plats à temps, tables à temps, plats morts au passe) :

| Service | la meilleure règle | la recherche, la nuit | la recherche qui attend |
|---|---|---|---|
| grande brigade, « le plus urgent » | 5,1 ; 2,2 / 14,3 ; 17,5 (la table) | 6,9 ; 3,1 ; 22,8 | **10,4 ; 4,4 ; 14,0** (+6,00, de 3,97 à 8,03) |
| grande brigade, « suit sa table » | 5,5 ; 2,5 / 14,3 ; 16,3 (la table) | — | **11,5 ; 4,8 ; 12,0** (+7,73) |
| le grand détour, « le plus proche » | 5,9 ; 2,5 / 8,3 ; 5,0 (la table) | 3,7 ; 1,6 ; 13,4 | **9,9 ; 4,1 ; 3,2** |
| le grand détour, « le plus urgent » | 7,7 ; 3,3 / 8,3 ; 3,2 (la table) | 4,1 ; 1,7 ; 10,0 | **10,4 ; 4,3 ; 2,5** (+6,87, de 5,31 à 8,42) |
| le grand détour, « au hasard » | 3,2 ; 1,5 / 8,3 ; 5,5 (la table) | 2,5 ; 1,1 ; 11,0 | **5,6 ; 2,4 ; 5,2** |
| le grand détour, « suit sa table » | 5,4 ; 2,3 / 8,3 ; 3,8 (la table) | — | **10,9 ; 4,5 ; 2,4** |
| le grand détour, sans humain | 1,4 ; 0,6 / 8,3 ; 5,7 (la plus ancienne) | 2,3 ; 1,0 ; 9,5 | **4,0 ; 1,8 ; 1,4** |

- **Dans la grande brigade, la recherche qui attend fait plus que doubler la meilleure règle** : cinq cuisiniers, c'est
  là qu'il y a le plus à coordonner.
- **Dans le grand détour, la recherche qui attend bat enfin la règle de la table** (10,4 contre 7,7), qui la battait
  la nuit (4,1 contre 7,7) ; avec le cuisinier qui suit sa table, **plus de la moitié des tables partent à temps**
  (4,5 sur 8,3), et presque aucun plat ne meurt au passe.

## Les trois derniers indicateurs de l'étape 0 (26/10, le soir)

Comptés sans rien décider (`src/service-measures.js`) : la **courbe du service** (les commandes venues et servies par
tranche de 25 tours, `cameBySlice`, `servedBySlice`), les **plats tendus par chaque cuisinier** (`servedByCook` : la
dernière main, celle qui sert ou pose au passe), et les tours où un poste est **réservé sans travailler** (un cuisinier
encore en chemin le retient, personne n'y travaille : `idleBoard`, `idleStove`, `idleCounter`). Dans l'onglet Stats
(« réservé sans travailler ») et la fin d'un service de la page. Les journaux des services sont identiques ; les
quatre empreintes changent parce qu'elles hachent les mesures, et redonnent les anciennes sans les nouvelles.

Ce qu'ils disent (30 services, le plat le plus rapide, le cuisinier « le plus urgent ») :

| Cuisine | fourneaux réservés à vide | planches | attente : fourneau | plats par cuisinier (robots…, le cuisinier) |
|---|---|---|---|---|
| petite | 36,9 | 32,1 | 18,6 | 6,4 / 4,4 / 7,4 |
| en couloir | 16,1 | 16,8 | 29,4 | 5,8 / 4,5 |
| grande brigade | **80,6** | **74,4** | 25,6 | 7,0 / 6,5 / 5,3 / 4,8 / 6,0 |
| passe-plats | 12,0 | 2,8 | 12,2 | 4,0 / 6,1 / 3,4 |
| postes | 30,0 | 18,1 | 16,4 | 4,4 / 5,1 / 7,3 |
| coupée en deux | 11,0 | 8,4 | **70,4** | 0 / 4,7 / 10,0 |
| le grand détour | 13,7 | 13,2 | 5,5 | 1,1 / 16,5 / 0 |

- **L'hypothèse de l'étape 0 était fausse** : dans la cuisine coupée en deux, les fourneaux ne sont réservés à vide
  que 11 tours par service, alors qu'on les attend 70 tours. L'attente vient d'ailleurs, à trouver
  ([`recherche/oublis.md`](recherche/oublis.md)).
- **La grande brigade réserve beaucoup à vide** : 80 tours de fourneau et 74 de planche par service, retenus par des
  cuisiniers qui marchent encore. Cinq cuisiniers pour deux fourneaux : la réservation faite au départ coûte cher.
- **Les plats par cuisinier comptent la dernière main** : le robot qui coupe dans la cuisine coupée en deux n'en tend
  aucun (il passe ses oignons par les comptoirs) ; le robot du passe du grand détour en tend 16,5, les autres presque
  rien. Ce n'est pas le travail de chacun, c'est qui sert.
- **La courbe** monte en 25 tours, tient à peu près 2,5 plats par tranche dans la petite cuisine (4 à 5 dans la grande
  brigade), puis retombe à la fin, quand les dernières commandes ne sont plus finies.

**La réclame de l'aboyeur : mesurée, pas gardée.** La règle de la table a appris à réclamer d'abord le plat dont les
voisins attendent déjà au passe, celui qui attend depuis le plus longtemps (`src/rules.js`, le 26/10). Sur les sept
cuisines et les cinq cuisiniers, 30 services : de −0,3 à +0,6 plat à temps, autour de zéro en moyenne. Comme pour les
mains comptées, une règle simple de plus ne fait pas avancer les tables ; ce qui les fait avancer, c'est la recherche
qui sait attendre. L'aboyeur reste à faire en rôle (un robot au passe qui annonce et réclame), pas en règle.

## L'aboyeur et la mise en place (26/10, le soir, fin de l'étape 1)

Sami (26/10, le soir) : « passe à l'implémentation de l'aboyeur et la tâche qui a été reportée » (la mise en place).
Deux réglages, éteints par défaut : les services sans eux sont inchangés (les empreintes).

**L'aboyeur** (`src/service-aboyeur.js`) : un rôle de robot, `aboyeur`, comme `passe`. Il tient le passe, sert ce qui
est prêt, et ne le quitte jamais. Tant qu'il est là :
- les autres robots ne prennent que **les plats qu'il a fait marcher** (« ça marche » : le plat rejoindra le passe avec
  sa table, d'après la règle de la table ; au banquet et pour un coursier, pas trop tôt) ;
- et d'abord **ceux qu'il réclame** : ceux dont les voisins attendent déjà au passe, celui qui attend depuis le plus
  longtemps (`order.called`, l'événement `called` du journal) ;
- l'humain n'obéit pas : les cuisiniers simulés choisissent comme avant.

Les « faire marcher » de la règle de la table et du rétroplanning ont quitté `src/rules.js` pour
`src/service-firing.js`, que lisent les règles et l'aboyeur (sans rien changer, les empreintes).

Mesuré (30 services, le cuisinier « le plus urgent », par paires ; le même robot en `passe` puis en `aboyeur`) :

| Service | la plus ancienne | le plus rapide | la table | le rétroplanning |
|---|---|---|---|---|
| le grand détour, tables | −0,47 | +0,13 | **+0,43** (0,03 à 0,84) | −0,33 |
| le grand détour, banquet | −0,73 | −0,73 | **−2,87** (−3,99 à −1,74) | −0,37 |
| postes, tables | −0,03 | −0,13 | −0,17 | −0,43 |

- **L'aboyeur ne fait presque rien gagner** : il impose aux autres la manière de faire marcher de la règle de la
  table, qui ne bat pas les autres règles ; au banquet, il retient des plats que les règles auraient lancés à temps.
  C'est la même leçon que la réclame en règle : ce qui fait avancer les tables, c'est la recherche qui sait attendre.
- **Il lui faut des comptoirs** : dans la grande brigade, sans comptoir, personne ne lui apporte de plat ; il annonce
  et réclame, mais ne sert rien, et la cuisine perd un robot (5,1 → 3,6 plats à temps avec la règle de la table, −1,47 de −2,78 à −0,15).

**La mise en place** (`setup.miseEnPlace`, `src/service-mise.js`) : un robot libre, sans commande à prendre, prépare
d'avance : il prend un ingrédient, le coupe et le pose sur un comptoir, deux préparations en attente au plus ; la
commande suivante de ce plat la reprend là où elle est (dans les mains du robot, s'il ne l'a pas encore posée : il la
cuit et la sert alors lui-même). Le robot du passe et l'aboyeur ne préparent pas. Il faut un comptoir : la petite
cuisine, la cuisine en couloir et la grande brigade n'en ont pas.

Mesuré par paires (30 services, le plat le plus rapide, le cuisinier « le plus urgent »), selon ce qu'on prépare :

| Cuisine | tout, 2 au plus | tout, 1 au plus | les salades | **les soupes** |
|---|---|---|---|---|
| passe-plats | −0,07 | +0,10 | 0 (le robot qui coupe ne fait que les soupes) | −0,07 |
| postes | +0,10 | −0,17 | 0 | +0,10 |
| coupée en deux | −2,00 | −1,23 | −2,60 | **+1,37 (0,66 à 2,07)** |
| le grand détour | −1,83 | −2,00 | −2,23 | −1,00 (−2,12 à 0,12) |

- **Préparer des salades fait du tort** : une salade posée d'avance prend un comptoir, et dans la cuisine coupée en deux
  et le grand détour, les comptoirs sont les relais entre les postes ; elle les bouche.
- **Couper des oignons d'avance aide là où l'on coupe d'un côté et cuit de l'autre** : dans la cuisine coupée en deux,
  +1,4 plat à temps ; le robot du côté des planches n'attend plus les commandes pour couper. Ailleurs, rien, ou un
  robot occupé quand la commande arrive.
- **Par défaut, la mise en place ne prépare donc que les soupes** (`MISE`, deux au plus).
- **Avec la recherche** (la cuisine coupée en deux, 30 services, le cuisinier « le plus urgent ») : 14,6 plats à temps
  sans mise en place, **15,8** avec, le meilleur score de cette cuisine ; la plus ancienne commande passe de 12,9 à
  14,4. Les mondes de la recherche jouent la mise en place comme le service.

Dans l'onglet Cuisine (le rôle `aboyeur`, « La mise en place »), et `npm run compare -- --aboyeur --mise-en-place`.

## La coupe en série (26/10, le soir, étape 2)

Sami (26/10, le soir) : la coupe en série, d'abord. Le premier calibrage du banquet avait échoué parce que le modèle
fait un plat par voyage : à 8 couverts et 30 tours au chaud, aucun envoi ne partait (« Le banquet », plus haut).

**Le lot** (`setup.banquet.batch`, `src/service-batch.js`) : au banquet, un cuisinier qui prend un plat d'un envoi
prend avec lui jusqu'à `batch − 1` autres plats du même envoi encore ouverts, et les fait ensemble, comme un traiteur :
un voyage à la caisse (un ingrédient par portion), une coupe plus longue d'**un tour par portion de plus** (la planche et
le couteau s'installent une fois ; hypothèse, [`recherche/production.md`](recherche/production.md)), une grande
marmite, et tous au passe d'un coup. Le plat pris mène (il porte les pas) ; les autres le suivent (« dans le lot »,
`batched`), personne d'autre ne les voit ; si la marmite brûle, ils redeviennent des plats à faire, chacun le sien.
Éteint par défaut (`batch` 1) ; dans l'onglet Cuisine et `npm run compare -- --banquet --serie [k]`.

Mesuré par paires (30 banquets, le cuisinier « le plus urgent » ; plats à temps, un par un → par lots de 3 → un lot
par envoi entier) :

| Banquet | Cuisine | le plus rapide | le rétroplanning |
|---|---|---|---|
| 6 couverts, 60 tours au chaud | petite | 5,0 → 5,6 → 7,4 | 4,7 → **6,3** (+1,60) → 5,9 |
| | passe-plats | 1,6 → 6,1 → **11,7** | 4,9 → 9,3 (+4,43) → 5,9 |
| | postes | 3,2 → 10,5 (+7,27) → **11,7** | 4,7 → 7,8 → 6,1 |
| | le grand détour | 6,5 → 5,9 → 8,8 | 6,1 → 6,2 → **11,9** |
| | grande brigade | 5,3 → 7,0 → **9,4** | 5,4 → 5,5 → 5,8 |
| 8 couverts, 30 tours au chaud | petite | 0 → 1,3 → 7,4 | 0 → 0,6 → **8,9** |
| | passe-plats | 0 → 0,9 → 2,1 | 0 → 0 → 0,3 |
| | postes | 0 → 0,7 → 3,2 | 0 → 1,1 → **8,9** |
| | le grand détour | 0 → 0,6 → 7,0 | 0 → 1,0 → **12,9** |
| | grande brigade | 0 → 1,8 → 3,6 | 1,2 → 3,2 → **7,9** |

- **La série fait le banquet** : à 6 couverts, jusqu'à trois fois plus de plats à temps ; à 8 couverts et 30 tours au
  chaud, le calibrage qui échouait le matin (aucun plat à temps) sert 8 à 13 plats sur 16 avec un lot par envoi et le
  rétroplanning. Un traiteur ne fait pas un plat par voyage : le modèle non plus, maintenant.
- **Le lot entier va avec le rétroplanning**, qui le lance au bon moment ; le plat le plus rapide le lance trop tôt, et
  au passe-plats, un lot entier attend au chaud et meurt (2,1 contre 11,7 par lots de 3 à 6 couverts) : la taille du
  lot et l'heure de son départ se décident ensemble. C'est un choix pour la recherche (mesures dans la file).
- Le chiffre clé, **un tour (30 s) par portion de plus**, est une hypothèse ([questions au spécialiste](recherche/questions-specialiste.md), 10).

## Le poste d'emballage, la dark kitchen (26/10, le soir, étape 3)

**Le poste** (une lettre `E` dans le plan, un poste de travail comme une planche) : avec `setup.delivery.packing`
tours, un plat livré passe par le poste d'emballage avant le passe ; le pas `pack` s'ajoute avant l'envoi, une fois
(`order.packed`), pour les robots comme pour le chef au clavier. Sans poste `E` dans le plan, rien ne change.

**La dark kitchen** (`KITCHENS.dark`, Sami : de nouvelles stations dans de nouvelles cuisines, les sept d'avant
inchangées) : la petite cuisine, la livraison cochée, deux postes d'emballage avant le passe, **2 tours** (une minute)
pour emballer un plat, une hypothèse ([`recherche/production.md`](recherche/production.md)). L'empreinte des règles
ne parcourt plus que les sept cuisines d'avant (une liste fixe) ; les cuisines ajoutées ont la leur (`added`).

Mesuré par paires (30 services, le cuisinier « le plus urgent » ; plats à temps, commandes parties sans leur plat ;
l'écart avec la même cuisine sans emballage) :

| Emballer un plat | la plus ancienne | le plus rapide | le rétroplanning |
|---|---|---|---|
| 0 tour | 11,9 ; 7,8 partis | 12,6 ; 7,1 | 11,6 ; 8,1 |
| 1 tour | 10,7 ; 9,0 (−1,23) | 11,5 ; 8,2 (−1,10) | 10,1 ; 9,5 (−1,43) |
| **2 tours** | 10,0 ; 9,6 (−1,87) | **11,3 ; 8,4** (−1,27) | 9,5 ; 10,1 (−2,10) |
| 4 tours | 8,9 ; 10,7 (−3,00) | 10,5 ; 9,2 (−2,03) | 8,4 ; 11,2 (−3,17) |

- **L'emballage coûte un plat à temps par tour d'emballage, à peu près** : un coursier n'attend que 10 tours, chaque
  tour avant le passe en fait partir un de plus sans son plat. Le plat le plus rapide y perd le moins.
- Ce que l'emballage évite (les erreurs de commande, 2 à 12 % selon les sources) n'est pas modélisé : un plat emballé
  et un plat non emballé partent pareil. Ce sera le pendant des erreurs de l'humain (étape G).
- La recherche dans la dark kitchen : dans la file.

## La plonge (26/10, le soir)

**Les assiettes comptées** (`setup.plates`, `src/service-plates.js`) : la cuisine a un stock d'assiettes propres ; un
plat en prend une quand on le sert (son envoi attend s'il n'y en a plus), et l'assiette revient sale **50 tours** plus
tard, le client ayant mangé. On la lave à l'**évier** (une lettre `L` dans le plan), **6 à la fois en 3 tours** : un
robot de rôle `plonge`, ou un robot libre sans rien à cuisiner, ou n'importe quel robot libre d'abord quand il ne
reste plus d'assiette propre ; le chef au clavier aussi, à l'évier. Les chiffres sont des hypothèses tirées des
lave-vaisselle à capot et de la durée d'un repas ([`recherche/production.md`](recherche/production.md)).

**La brigade avec plonge** (`KITCHENS.plonge`) : la grande brigade, un évier à côté des planches, 15 assiettes.

Mesuré par paires (30 services, le plat le plus rapide, le cuisinier « le plus urgent » ; sans assiettes comptées :
25,0 plats à temps) :

| Assiettes | les robots lavent quand ils sont libres | un robot plongeur |
|---|---|---|
| 8 | 13,6 (−11,37) ; attente d'assiette 306 tours | 15,7 (−9,30) ; 154 |
| 12 | 22,0 (−2,93) ; 77 | 21,9 (−3,07) ; 7 |
| **15** | **23,8 (−1,13)** ; 18 | 22,0 (−3,00) ; 0 |
| 25 | 24,1 (−0,83) ; 0 | 22,0 (−3,00) ; 0 |

- **Un plongeur dédié coûte un cuisinier** : avec lui, plus personne n'attend d'assiette, mais la brigade perd trois
  plats à temps, ceux qu'il aurait faits. Avec assez d'assiettes, mieux vaut que les robots lavent entre deux plats.
- **Le stock décide** : sous 12 assiettes pour une brigade de cinq, l'attente d'assiette écrase le service.
- Laver une seule assiette à la fois (dès qu'il y en a une sale) gaspille le cycle : un vrai plongeur attend un panier
  plein, sauf quand il manque des assiettes. Une règle à mesurer.
- La recherche dans cette cuisine : dans la file.

## Le ménage et les allergènes (26/10, le soir)

**Les planches se souviennent** (`setup.hygiene`, `src/service-hygiene.js`) : chaque planche garde le dernier
ingrédient coupé. **Une salade sur dix est pour un allergique à l'oignon** (« sans oignon », tirée à part : les
commandes elles-mêmes ne changent pas ; la recherche en imagine dans ses mondes). Couper sa salade sur une planche qui
a coupé des oignons demande de la **nettoyer d'abord, 3 tours** ; un cuisinier préfère une planche qu'il n'a pas à
nettoyer, comme un fourneau propre plutôt qu'un brûlé. **Le ménage** : une planche se nettoie aussi toutes les N
coupes (0 par défaut). Les chiffres sont des hypothèses : ni la part des commandes « sans », ni le temps d'un
nettoyage ne se trouvent ([questions au spécialiste](recherche/questions-specialiste.md), 18-20). Dans l'onglet
Cuisine et `npm run compare -- --hygiene`.

Mesuré par paires (30 services, le plat le plus rapide, le cuisinier « le plus urgent ») :

| Cuisine | sans | 10 % sans oignon | 30 % | 10 %, ménage toutes les 6 coupes |
|---|---|---|---|---|
| petite | 16,9 | 16,8 (−0,03) ; 0,2 nettoyage | 16,9 (0) ; 0,9 | 16,6 (−0,23) ; 2,4 |
| grande brigade | 25,0 | 25,0 (0) ; 0,5 | 24,8 (−0,20) ; 1,3 | 24,8 (−0,20) ; 3,9 |
| postes | 13,6 | 13,6 (+0,03) ; 0,2 | 13,8 (+0,23) ; 0,9 | 14,0 (+0,40) ; 2,2 |
| coupée en deux | 12,0 | 12,0 (0) ; 0 | 12,0 (0) ; 0 | 12,0 (+0,03) ; 0,6 |

- **Les allergènes ne coûtent presque rien ici** : moins d'un plat « sans » par service à 10 %, et avec deux planches,
  le cuisinier prend celle qui n'a pas coupé d'oignons : moins d'un nettoyage par service. Dans une cuisine à une
  seule planche, ou avec plusieurs allergènes, ce serait autre chose : une variante à faire si Sami le veut.
- **Le ménage** toutes les 6 coupes coûte au plus 0,2 plat à temps. Il ne pèse que si on le rend fréquent.

## Les pauses, la fatigue, les erreurs ; les pannes des robots (26/10, le soir)

Sami (26/10, le soir) : les pauses, la fatigue et les erreurs pour **l'humain**, et **des pannes pour les robots**.
Quatre réglages, chacun éteint par défaut (`src/service-human.js`, `src/service-breakdowns.js`) ; le chef au clavier
n'en a aucun (c'est lui). Les chiffres sont des hypothèses ([`recherche/production.md`](recherche/production.md),
[questions au spécialiste](recherche/questions-specialiste.md), 21-24) :
- **la fatigue** : après le tour 100, les gestes du cuisinier simulé durent 10 % de plus ;
- **les pauses** : une pause de 10 tours (5 minutes) par service, à un tour tiré entre 40 et 160 ; il finit son plat,
  s'écarte et s'arrête. La pause légale (20 minutes dès 6 heures) tombe hors d'un service de 1 h 40 ;
- **les erreurs** : 2 % de ses plats sont faux (4 % une fois fatigué), la commande est à refaire ;
- **les pannes** : un robot s'arrête 10 tours, une fois tous les 1 000 tours en moyenne (1 % du temps, le « 99 % de
  disponibilité » d'un fabricant) ; son geste attend, il reste où il est, son poste reste à lui, sa marmite cuit.
- **La recherche ne sait pas quand viendront la pause ni la panne** : ses mondes les tirent à nouveau.

Mesuré par paires (30 services, le plat le plus rapide, le cuisinier « le plus urgent ») :

| Cuisine | sans | fatigue | pause | erreurs | les trois | pannes | pannes ×5 |
|---|---|---|---|---|---|---|---|
| petite | 16,9 | 16,9 (0) | 16,5 (−0,33) | 16,7 (−0,20) | **16,1 (−0,77)** | 16,7 (−0,13) | 15,9 (−1,00) |
| grande brigade | 25,0 | 24,4 (−0,60) | 24,5 (−0,43) | 24,8 (−0,13) | **24,3 (−0,70)** | 24,6 (−0,40) | 22,8 (−2,20) |
| le grand détour | 15,4 | 14,9 (−0,50) | 14,7 (−0,67) | 15,4 (0) | **14,5 (−0,83)** | 15,3 (−0,03) | 15,1 (−0,23) |

- **Un humain fatigué, qui fait sa pause et se trompe parfois, coûte un plat à temps environ** ; dans le grand détour,
  il ne sert presque jamais lui-même (le robot du passe le fait), ses erreurs n'y comptent pas.
- **Les pannes au rythme d'un fabricant coûtent peu** ; cinq fois plus fréquentes, deux plats dans la grande brigade.
- Ce que la recherche y gagne, en imaginant la pause et la panne : dans la file.

## Le robot qui barrait le fourneau ; le relais oublié (26/10, la nuit, correction)

Sami (26/10, une capture de la cuisine coupée en deux, la recherche, le cuisinier « le plus urgent ») : le fourneau
du haut finit par brûler, et le robot 1 ne passe plus ses oignons par le comptoir. Deux défauts, chacun assez pour
bloquer un service, et pas seulement avec la recherche :
- **le robot qui surveille sa marmite restait devant le fourneau** quand le cuisinier venait la retirer à sa place
  (`watch`, `src/service-legs.js`). Le fourneau du haut n'a qu'une case d'accès : le cuisinier attendait à côté, la
  soupe brûlait. Désormais, une marmite qu'un autre est venu prendre n'est plus surveillée : le robot s'écarte ;
- **une soupe rouverte gardait la marque de son relais** (`order.relayed`) : brûlée après être passée par un
  comptoir, elle ne pouvait plus y repasser, et le robot des planches, ses oignons coupés en main, attendait un
  fourneau hors de sa portée jusqu'à la fin du service (165 tours au service 19, avec les règles). Une commande à
  refaire (brûlée, morte au passe, plat faux) repart désormais sans cette marque (`AGAIN`, `src/service-basics.js`).

Avant et après, 9 services, la plus ancienne commande, le cuisinier « le plus urgent » (plats à temps, et soupes
brûlées sur les 9 services) :

| Cuisine | avant | après |
|---|---|---|
| petite | 18,1 (14) | 18,8 (1) |
| en couloir | 8,2 (3) | 8,7 (0) |
| grande brigade | 23,7 (13) | 24,9 (3) |
| passe-plats | 11,3 (14) | 12,9 (5) |
| postes | 14,9 (14) | 17,1 (0) |
| coupée en deux | 12,2 (9) | **16,3 (0)** |
| le grand détour | 14,6 (8) | 15,3 (2) |
| dark kitchen | 10,1 (7) | 11,1 (2) |
| brigade avec plonge | 22,0 (21) | 22,8 (14) |

- **La plupart des soupes brûlées venaient de là** : le robot qui veillait sa marmite gênait celui qui venait la
  prendre. Les règles y gagnent jusqu'à quatre plats ; **les mesures du soir sont refaites** dans la file (le tag
  `2026-10-26-correctif`), les chiffres plus haut sont d'avant la correction. Les résultats :
  [mesures-27-10.md](mesures-27-10.md).
- Le test des croisements comparait le début et la fin d'un tour : à deux cases par tour, deux cuisiniers qui font le
  tour d'un carré de quatre cases, chacun par son côté, finissaient l'un à la place de l'autre sans s'être croisés. Il
  regarde désormais pas à pas (`tests/service.test.js`).
- Reste, vu au passage : avec la règle du plat le plus rapide, les trois comptoirs de la cuisine coupée peuvent se
  remplir d'oignons coupés pendant que les autres enchaînent les salades ; le robot des planches attend alors qu'un
  comptoir se libère (45 tours au service 8). Ce n'est pas un blocage, c'est la règle ; la recherche les cuit.

## Les cuisiniers se croisent (28/10, Sami)

Sami : gagnerait-on du temps sans les collisions entre cuisiniers, une station restant à un seul ? Une case, quelle
taille ? À 1 m², deux cuisiniers sur une même case seraient-ils réalistes ?

- **La taille d'une case** : le modèle dit « une case ≈ un pas » (0,75 m environ), sans source (question 2 au
  spécialiste). Les repères publiés sont ceux de la NKBA, l'association américaine des cuisinistes, pour des cuisines
  domestiques : 42 pouces (1,07 m) d'allée pour un cuisinier, 48 pouces (1,22 m) quand deux s'y croisent
  ([JLC][nkba]). Deux personnes qui se croisent de profil sur une case d'un mètre, oui ; deux qui y restent ou y
  travaillent, non.
- **L'option `setup.crossing`** (« Les cuisiniers se croisent » dans l'onglet Cuisine, `npm run compare --
  --croisement`), désactivée par défaut, `src/service-crossing.js` : les cases d'allée sont partagées (`shared` des
  réservations de mcts-commun), celles d'où l'on travaille une station restent à un seul, la station à celui qui la
  prend (et la place cédée au plus proche, `claimFromAfar`, 23/10). Deux cuisiniers ne se croisent pas de face d'un
  pas à l'autre : l'un attend un pas sur la case de l'autre, puis ils passent.
- **Où partait le temps** : sans l'option, 2 services de la grande brigade avec tables font 244 000 appels à A*, de 9
  à 15 cases explorées chacun. C'est leur coût fixe qui pèse, pas les collisions : avec l'option seule, autant d'appels
  et le même temps. Avec l'option, un trajet suit donc d'abord les distances au sol déjà gardées (`directPath`), et
  A* ne sert que si une case y est prise :

| 2 services, tables, la plus rapide et la recherche | sans l'option | avec | appels à A* |
|---|---|---|---|
| grande brigade | 55 s | 20 s | 296 000 → 30 000 |
| le grand détour | 19 s | 7,5 s | 167 000 → 8 400 |

  Les plats à temps sont les mêmes que sans le trajet direct.
- **Le trajet direct pour tous** (Sami, 28/10 : d'accord pour le changement de modèle) : avec ou sans l'option, un
  trajet suit d'abord les distances au sol, A* seulement si une case y est prise. À longueur égale, il ne prend pas
  toujours le chemin d'A* : l'empreinte des règles change (`262c9a88…` → `f4c62a4f…`), les autres non. Avant et après,
  les quatre règles, 50 services, « le plus urgent », dans les neuf cuisines : les plats à temps sont les mêmes au
  dixième près partout (de 7,4 au couloir à 26,3 dans la grande brigade), et la mesure passe de 35 s à 19 s.
- **Le cuisinier enfermé** (28/10, Sami : d'accord) : au couloir, 60 000 des 82 000 appels à A* ne trouvaient rien. Un
  cuisinier au fond d'un cul-de-sac, un autre garé à sa sortie : A* explorait chaque attente jusqu'à son horizon avant
  d'abandonner. Quand le cuisinier ou sa cible a tous ses côtés murés pour de bon (un mur, ou un autre garé là),
  `planLeg` conclut tout de suite qu'il n'y a pas de chemin (`shutOut`, `src/service-crossing.js`) : ce qu'A* aurait
  trouvé, sans changer aucune empreinte. 2 services du couloir avec tables, la plus rapide et la recherche : 11,6 s →
  3,0 s ; le détour et la brigade n'y gagnent rien (leurs chemins introuvables sont d'une autre sorte). Un essai qui
  gardait en mémoire le dernier chemin introuvable tant que rien n'était réservé ne gagnait que 3 % : les échecs ne se
  répètent pas d'un tour à l'autre, mais d'un monde de la recherche à l'autre.
- **Deux au plus par case** est demandé à mcts-commun (une capacité dans les réservations), par le tableau des
  sessions. Les mesures de l'option, avec et sans, sont dans la file (`essais-croisement.json`, tag
  `croisement-2026-10-28`) : on y regarde ce que le modèle perd de la congestion, au couloir et au détour.

[nkba]: https://www.jlconline.com/remodeling/guidlines-for-kitchen-island-functionality
