# Les indicateurs

Sami (26/10/2026) : reprendre les mesures du métier. Ce fichier liste ce que mesurent les restaurants, les
traiteurs et les dark kitchens, ce que le simulateur compte déjà (`measuresOf`, `src/simulate.js`), et ce qu'il
ajoutera pour comparer les règles et la recherche. Les sources sont dans [brigade-service.md](brigade-service.md),
[traiteur.md](traiteur.md) et [livraison.md](livraison.md).

## Le service à la carte

| Indicateur réel | Déjà compté | Nom dans le code | À ajouter |
|---|---|---|---|
| Couverts servis | oui | `onTime` + `late` | — |
| Plats servis à temps | oui | `onTime` | c'est le chiffre que la recherche doit gagner, par paires |
| Plats en retard, manqués | oui | `late`, `missed` | — |
| **Temps de bon** (de l'annonce au passe) | en moyenne | `meanServe` | le **9e décile** et le **maximum** |
| **Retard** | non | — | le retard total et le retard **maximal** d'un plat servi |
| **Le coup de feu** | non | — | le **pic de bons ouverts** au même tour, et le tour où il tombe |
| **Bons par heure** | non | — | les plats servis par tranche de 20 tours (une courbe, pas un chiffre) |
| **Utilisation d'un poste** | non | — | la part des tours où chaque planche, chaque fourneau, le passe sert ; le plus haut dit le goulot |
| Attente devant un poste | en total | `waits` | **par poste** : devant quelle planche, quel fourneau |
| Pas des cuisiniers | oui | `moves` | — |
| **Plats refaits** | en partie | `burnt` (avec la cuisson sans surveillance) | les plats morts au passe, quand le passe aura une durée (étape 1) |
| **Rupture** (86) | non | — | les commandes manquées faute d'ingrédient (étape 1) |
| Part de l'humain | non | — | les plats servis par le cuisinier humain, par chaque robot |

Comptés depuis le 26/10 (étape 0, `src/service-measures.js`) : le temps de bon au 9e décile et au maximum
(`p90Serve`, `maxServe`), le retard maximal (`maxLate`), le coup de feu (`peakOpen`, `peakAt`), l'utilisation et
l'attente par sorte de poste (`useBoard`… `waitPass`…), les plats du cuisinier humain (`servedByHuman`). Le soir
même : les commandes venues et servies par tranche de 25 tours (`cameBySlice`, `servedBySlice`, la courbe du
service), les plats tendus par chaque cuisinier (`servedByCook`, la dernière main seulement), et les tours où un poste
est réservé par un cuisinier encore en chemin, personne n'y travaillant (`idleBoard`… `idleCounter`).

## Le banquet

| Indicateur réel | Ce qu'il compte | Ce que le simulateur comptera |
|---|---|---|
| **Envoi à l'heure** | les plats partis à leur heure | les assiettes d'un envoi prêtes à T |
| **Retard d'envoi** | de combien un envoi part après T | le retard total et **maximal** |
| **Maintien au chaud** | le temps entre la cuisson et le service, borné par la règle | le temps **maximal** à l'étuve, les plats perdus pour l'avoir dépassé |
| **Pertes** | les préparations jetées | les plats perdus, et les assiettes faites en trop |

## La livraison

| Indicateur réel | Ce qu'il compte | Ce que le simulateur comptera |
|---|---|---|
| **Délai de préparation** | de la commande au sac fermé | moyen et **maximal** |
| **Attente du coursier** | le temps du coursier au passe | moyenne et **maximale** |
| **Attente du plat** | le temps du sac prêt sans coursier | moyenne et **maximale** |
| **Livraisons en retard** | la part partie après l'heure annoncée | les commandes en retard, celles parties sans coursier |
| **Commandes par heure** | le débit | les commandes parties par tranche de 20 tours |

## Ce qui n'est pas compté, et pourquoi

Les ratios financiers sont la langue des restaurants, mais le simulateur n'a ni prix ni salaires :
- **le coût matière** (*food cost*) : le coût des denrées sur le prix de vente, souvent visé entre 28 et 35 %
  ([upmenu][upmenu]) ;
- **le prime cost** : le coût matière plus la masse salariale, autour de 55 à 65 % du chiffre d'affaires selon les
  sources ([fishbowl][fishbowl]) ;
- **le RevPASH** : le chiffre d'affaires par place et par heure ([Toast][toast-kpi]) ;
- **la rotation des tables** : les tables servies sur le nombre de tables, par service ([fishbowl][fishbowl]) ;
- **le ticket moyen** : les ventes sur les couverts.

Ils sont notés ici pour le vocabulaire. Un prix par plat ne changerait rien aux décisions des robots tant que tous
les plats rapportent pareil ; il viendra, s'il vient, avec une carte où un plat cher et long concurrence un plat
simple et rapide.

## Pourquoi des maxima

Une moyenne cache le pire. C'est la leçon de mcts-urgences, reprise par mcts-entrepot : le pic et le maximum disent
ce que la moyenne lisse. Ici :
- **le temps de bon maximal** : une table qui attend quarante minutes ne revient pas, même si les autres ont été
  servies vite ;
- **le pic de bons ouverts** : c'est le coup de feu, le moment où la cuisine se bloque ;
- **l'utilisation du poste le plus chargé** : le goulot, qui borne tout le reste.

## Comment on compare

Les règles de CLAUDE.md :
- les règles simples d'abord, sur les mêmes services ;
- la recherche doit les battre **par paires**, avec son intervalle ;
- un premier tri rapide peut rejeter une stratégie, jamais la promouvoir.

Un indicateur qui ne fait que compter ne change aucune décision. Mais les empreintes hachent les mesures
(`tests/fingerprint.test.js`, à venir avec l'outillage) : une nouvelle mesure change le hachage. Son commit le dit,
et vérifie que les journaux des services sont identiques.

[upmenu]: https://www.upmenu.com/blog/restaurant-kpis
[fishbowl]: https://www.fishbowl.com/guides/restaurant-kpis
[toast-kpi]: https://pos.toasttab.com/blog/on-the-line/restaurant-kpis
