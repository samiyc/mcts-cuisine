# La feuille de route des métiers de la cuisine

Sami (26/10/2026, `docs/prompt/recherche-metiers-cuisine.md`) : des termes et des mesures du monde des restaurants
et des traiteurs ; les bonnes pratiques de lopin ; la page en onglets, avec le panneau de gauche pour régler les
simulations, les replays et les stats.

Ses choix :
- **tout, dans l'ordre** : ces recherches, puis l'outillage, puis la page en onglets ; ensuite les étapes du
  métier ci-dessous, une à la fois ;
- **trois variantes** : la brigade de restaurant (la cuisine d'aujourd'hui, approfondie), le traiteur et le
  banquet, la dark kitchen et la livraison.

**Ce qui guide toutes les étapes** :
- **le service d'aujourd'hui reste tel quel** et comparable : une variante est un réglage de plus (`setup`), éteint
  par défaut, comme la cuisson sans surveillance. Ses empreintes ne bougent pas quand elle est éteinte ;
- **chaque étape se mesure seule**, par paires sur les mêmes services, avec un intervalle ;
- **la règle simple vient d'abord** ; la recherche doit la battre ;
- **les robots ne commandent pas l'humain** : ils devinent ce qu'il va faire (le cœur du projet,
  `docs/modele.md`) ;
- **tout est tiré d'une graine** et se rejoue ; les replays du chef au clavier restent lisibles ;
- **les mots du métier** dans la page et les docs, d'après [glossaire.md](glossaire.md) : le bon, le passe, faire
  marcher, réclamer, la rupture, le coup de feu.

## Avant : l'outillage et la page en onglets

Faits dans la foulée de ces recherches (26/10) :
- **l'outillage** de mcts-urgences et mcts-entrepot (`docs/outillage.md`) : les empreintes d'abord, le lint et
  son budget, les types, le hook, le journal des versions en données ;
- **la page en onglets** de lopin, déjà reprise par urgences : les onglets dans la bande du haut (Service, Cuisine,
  Replays, Stats), les réglages de l'onglet ouvert dans le panneau de gauche, repliable.

## Étape 0 : les indicateurs

D'après [indicateurs.md](indicateurs.md), compter sans rien décider :
- le temps de bon au 9e décile et au maximum, le retard maximal ;
- le pic de bons ouverts (le coup de feu) ;
- l'utilisation de chaque poste, et l'attente devant chacun ;
- les plats servis par l'humain et par chaque robot.

Ils passent dans `npm run compare`, dans l'onglet Stats et dans la fin d'un service de la page. Les empreintes des
mesures changent, celles des journaux non ; le commit le dit. Les règles d'aujourd'hui sont remesurées : le
goulot de chaque cuisine est-il celui qu'on croit ?

## Étape 1 : la brigade

D'après [brigade-service.md](brigade-service.md) :
- **les tables** : une commande de deux ou trois plats, servie quand tous sont au passe ; le temps de bon est
  celui de la table. Une table de deux soupes et une salade oblige à lancer la soupe d'abord ;
- **faire marcher** : la règle simple lance le plat le plus long de la table d'abord ; la recherche décide quand
  lancer chacun pour qu'ils arrivent ensemble ;
- **le passe à durée limitée** : un plat posé au passe qui attend sa table plus de N tours est perdu et se refait
  « à la volée » (N : une hypothèse à régler) ;
- **la rupture** : chaque caisse a un stock pour le service ; vide, le plat est retiré de la carte (86), ses
  commandes sont manquées. La page affiche la rupture comme un bon barré ;
- **la mise en place** : quelques tours avant le premier bon pour couper d'avance, dans la limite des comptoirs.
  C'est aussi la première forme des « robots en avance » (`docs/modele.md`, « La suite » 3) ;
- les mesures : les tables servies à temps, le temps de table maximal, les plats perdus au passe, les commandes
  manquées par rupture.

## Étape 2 : le traiteur

D'après [traiteur.md](traiteur.md) :
- **un banquet** : N couverts connus d'avance, deux ou trois envois à heure fixe (l'entrée, le plat) ;
- **le dressage en série** : un poste de dressage où s'enchaînent les assiettes d'un envoi ;
- **le maintien au chaud** : une étuve, un poste de plus, qui garde M tours au plus ; au-delà, l'assiette est
  perdue (comme la soupe qui brûle) ;
- **la règle simple** : le rétroplanning, le plat dont l'heure de début au plus tard est la plus proche d'abord
  (la règle de la date d'échéance) ;
- **la recherche** doit la battre : lancer tôt ce qui tient au chaud, garder les postes pour ce qui ne tient pas ;
- **l'humain** reste caché, et c'est désormais le seul caché : un bon terrain pour mesurer ce que vaut son modèle ;
- les mesures : les envois à l'heure, le retard maximal d'un envoi, le temps maximal à l'étuve, les pertes.

## Étape 3 : la livraison

D'après [livraison.md](livraison.md) :
- **les coursiers** : chaque commande a l'heure annoncée de son coursier, et son heure réelle, tirée autour ;
  un coursier qui attend trop part sans la commande ;
- **l'emballage** : un poste après le dressage ;
- **deux enseignes** sous un toit, avec deux cartes qui partagent les postes ;
- **la règle simple** : préparer dans l'ordre des coursiers annoncés ; la recherche joue sur l'incertitude de leur
  arrivée ;
- les mesures : l'attente des coursiers et des plats (moyennes et maxima), les commandes parties en retard ou sans
  coursier.

## Étape 4 : plus tard, ou pas

- **plus tard** :
  - **la plonge** : les assiettes et les casseroles comme ressource ; un plongeur, ou un robot, les rend ;
  - **les allergènes** : un plat sans gluten demande une planche propre, à nettoyer comme le fourneau brûlé ;
  - **la fatigue** et les pauses, d'après mcts-urgences, sur un service long ;
  - **les menus en plusieurs temps** : la salle réclame la suite quand la table a fini l'entrée ;
- **pas ici** :
  - l'argent (coût matière, prime cost, RevPASH) : noté dans [indicateurs.md](indicateurs.md), pas simulé tant
    que tous les plats rapportent pareil ;
  - les degrés et les sondes : les fenêtres de temps suffisent ;
  - le transport en liaison froide et les achats : de la logistique, plus proche de mcts-entrepot.

## L'ordre, et ce qui peut changer

Les étapes 0 et 1 viennent d'abord : elles approfondissent la cuisine d'aujourd'hui et ses mesures, sans nouveau
plan. Les étapes 2 et 3 sont deux variantes indépendantes : Sami choisira laquelle d'abord. Chaque étape peut
s'arrêter si la règle simple suffit et que la recherche n'y gagne rien : c'est un résultat aussi.
