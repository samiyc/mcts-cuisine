# Le service à la carte, en brigade

Ce que la cuisine simule déjà, vu par un restaurant : des commandes qui arrivent, des postes qu'on ne partage
pas, un passe. Ce fichier dit comment un vrai service s'organise, et ce qui manque au simulateur pour s'en
rapprocher. Les termes sont dans [glossaire.md](glossaire.md).

## Le chemin d'un bon

1. **La salle prend la commande** d'une table et l'envoie en cuisine : un bon imprimé, ou une ligne sur l'écran
   de cuisine (le KDS).
2. **L'aboyeur l'annonce** ; chaque partie répond et sait ce qu'elle a à faire. Il est souvent le chef ou le
   second, et contrôle chaque assiette avant l'envoi ([lesiteduchef][siteduchef]).
3. **Il fait marcher** les plats au bon moment : les plats d'une même table doivent sortir **ensemble**, chauds,
   alors que leurs cuissons n'ont pas la même durée. Le plus long part le premier.
4. **Les parties dressent** et posent au passe.
5. **Il réclame** ce qui manque, contrôle, et **envoie** : un serveur emporte la table.
6. Pour un menu en plusieurs temps (entrée, plat, dessert), la salle **réclame la suite** quand la table a fini :
   le plat ne marche qu'à ce moment.

Le simulateur fait les étapes 1, 4 et 5 pour une commande d'un plat : il n'y a ni table, ni suite, ni aboyeur. Un
plat part dès qu'il est fait.

## Ce que mesure un écran de cuisine

Les éditeurs de KDS comptent tous **le temps de bon** : de l'arrivée du bon à l'écran jusqu'au plat terminé, puis
jusqu'à sa remise au serveur ([Toast][toast-kds]). Ils le comparent :
- **au temps estimé du plat**, poste par poste. LS Central lève une première alerte quand un bon dépasse son
  estimation de 5 minutes, une seconde à 7 (ses valeurs par défaut, réglables) ([LS Central][ls-kds]) ;
- **à l'heure** : les bons par heure, et le temps moyen de chaque heure ([Toast][toast-kds]) ; Atlas cherche ainsi
  les heures de pointe et les postes qui font goulot ([Atlas][atlas]).

Il n'y a **pas de référence publiée** du temps de bon : un éditeur donne en exemple une cuisine à 14 minutes en
pointe et 8 en creux, à titre d'illustration ([Adora][adora]). Chaque cuisine se mesure contre elle-même. C'est
ce que fait le simulateur : des règles comparées par paires sur les mêmes services.

## Le goulot d'un poste

Une étude de file d'attente chez Chipotle a trouvé le goulot au poste des sauces et salades : **utilisé à
100 %**, il faisait attendre les postes d'avant et laissait sans travail ceux d'après ([Chipotle Queuing System][chipotle]).
C'est la leçon de l'entrepôt et de l'ordonnanceur de lopin : **le taux d'utilisation de chaque poste** dit où est
la contrainte. Le simulateur ne le compte pas encore ; il compte les attentes des cuisiniers (`waits`), sans dire
devant quel poste.

Quand deux postes identiques existent, certains KDS répartissent les plats entre eux selon le nombre d'articles
en attente sur chacun, et l'aboyeur ouvre ou ferme le second poste selon la charge ([Tabit][tabit]). Les rôles
des robots (`coupe`, `cuisson`, avec un coup de main quand le travail s'empile, `docs/modele.md`) en sont la
version du simulateur.

## Les plats refaits

Un plat faux ou perdu se jette et se refait : on l'a payé deux fois, et la table attend
([FSR Magazine][fsr]). Les éditeurs suivent **l'exactitude des commandes** (les bonnes sur le total ; l'un vise
98 % et plus, une cible de vendeur, pas une référence) et **les plats refaits** ([Ladle][ladle]).

Dans le simulateur, la seule cause d'un plat refait est **la soupe brûlée** (`burnt`) : la commande revient à
« open », le fourneau est à récurer. Le plat qui « meurt au passe » en serait une seconde : un plat dressé qui
attend trop au passe est perdu.

## Le gaspillage

L'étude du WRAP sur la restauration britannique (2012) répartit les déchets alimentaires ainsi : **45 % à la
préparation, 21 % par altération** (un produit qui se perd en stock), **34 % dans les assiettes** ; les trois
quarts étaient évitables ([WRAP 2012][wrap]). L'EPA irlandaise trouve dans les restaurants à service complet 44 %
à la préparation, 41 % dans les assiettes et 14 % de plats jamais servis ([EPA][epa]).

Le simulateur n'a pas de stock : les caisses sont infinies. Les plats perdus (brûlés, morts au passe) et les
préparations faites d'avance sans commande (les robots en avance) sont les deux pertes qu'il pourrait compter.

## Ce que le simulateur en reprend

Dans l'ordre de la [feuille de route](feuille-de-route.md), étape 1 :
- **les tables** : une commande de plusieurs plats, servie quand tous sont au passe. Le temps de bon est celui de
  la table, pas du plat ;
- **faire marcher** : la règle simple lance le plat le plus long d'abord ; la recherche décide quand lancer
  chacun ;
- **le passe à durée limitée** : un plat au passe plus de N tours est perdu (hypothèse : N à régler, sans source) ;
- **la rupture** : une caisse a un stock ; vide, le plat est retiré, les commandes de ce plat sont manquées ;
- **la mise en place** : avant le premier bon, quelques tours pour couper d'avance, dans la limite des comptoirs.

[siteduchef]: https://lesiteduchef.yo.fr/assets/files/Le-personneltenueetcomportement.pdf
[toast-kds]: https://support.toasttab.com/en/article/Kitchen-Reports-Overview?lang=en_US
[ls-kds]: https://help.lscentral.lsretail.com/Content/LS-Hospitality/Kitchen-Display-System/KDS-Performance-Station.htm
[atlas]: https://help.atlas.kitchen/reports/operations/production-efficiency-report
[adora]: https://adorapos.com/blog/kitchen-display-systems-essential-metrics-measuring-kitchen-performance-success
[chipotle]: https://www.academia.edu/5191558/Chipotle_Queuing_System
[tabit]: https://support-us.tabit.cloud/hc/en-us/articles/19344716519442-Using-load-balancing-in-Tabit-Kitchen
[fsr]: https://www.fsrmagazine.com/expert-takes/10-tips-improve-order-accuracy-your-restaurant
[ladle]: https://ladle.com/resources/blog/restaurant-success-by-the-numbers-kpis-to-measure/
[wrap]: https://bfff.co.uk/wp-content/uploads/2014/01/WRAP-Waste-in-the-UK-Hospitality-and-Food-Service-Sector-2012-Report.pdf
[epa]: https://www.epa.ie/media/epa-2020/monitoring-amp-assessment/circular-economy/Food-waste-in-Full-Service-Restaurants-v3.pdf
