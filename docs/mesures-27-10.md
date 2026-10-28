# Les mesures refaites après la correction (nuit du 26 au 27/10/2026)

Le 26/10 au soir, Sami a trouvé un blocage dans la cuisine coupée en deux. Deux défauts du modèle en étaient la cause,
corrigés par `ac78832` ([metiers.md](metiers.md), « Le robot qui barrait le fourneau ») :
- un robot qui surveillait sa marmite restait devant le fourneau quand un autre venait la retirer ;
- une soupe refaite gardait la marque de son relais.

La plupart des soupes brûlées venaient de là. Les mesures du soir, prises sur l'ancien code, ont donc été arrêtées,
et toute la file `night.json` a été refaite : 87 jobs (tag `2026-10-26-correctif`), de 21 h 33 à 5 h 43 sur 18 fils.
Les sorties sont dans `~/.mcts-backlog/runs/*_cuis-*-2026-10-26-correctif.txt`.

**Ce fichier remplace les chiffres de [metiers.md](metiers.md)** pour ce qu'il mesure. Le journal garde les chiffres
d'avant, qui disent l'histoire.

Comment lire les tableaux :
- 30 services par cuisine et par cuisinier simulé ; les cinq colonnes du milieu sont les plats servis à temps par
  service ; en gras, le meilleur de la ligne ;
- le gain de la recherche se lit par paires contre la plus ancienne commande, avec son intervalle à 95 %. L'écart à la
  meilleure règle est la différence de deux gains, sans intervalle ;
- « anc → rech » donne l'indicateur propre à chaque famille, pour la plus ancienne puis pour la recherche.

## Ce qu'il faut retenir

- **La recherche est la meilleure, ou à égalité avec la meilleure règle, dans 82 mesures sur 87.** Les cinq autres
  sont à 0,1 ou 0,2 plat de la meilleure règle, sous le bruit : le banquet en couloir (quatre humains), où un seul
  robot ne laisse rien à choisir, et le banquet de la grande brigade avec le cuisinier qui suit sa table (le
  rétroplanning 11,6, la recherche 11,5).
- **Les règles sont fragiles, la recherche ne l'est pas.** Au banquet dur (8 couverts, 30 tours au chaud), la table
  fait 0,2 au grand détour et le rétroplanning 0,0 au passe-plats, alors que l'un ou l'autre est la meilleure règle
  ailleurs. La recherche fait 11,7 à 15,9 partout. Aucune règle simple ne vaut pour toutes les cuisines.
- **Les tables** : avec un humain, +1,4 à +4,0 plats à temps dans le passe-plats, les postes et la coupée en
  deux ; +5 à +7 dans la grande brigade, qui sert 4,6 à 4,9 tables à temps sur 14,3 au lieu de 1,9. Les tables
  restent difficiles : un tiers à temps au mieux.
- **La coupe en série double le banquet** pour la recherche : 10,4 à 11,9 plats à temps sur 12 environ dans la
  petite cuisine, le passe-plats et les postes, contre 5,7 à 7,6 pour les règles. Dans le passe-plats et les postes, les deux
  envois partent à l'heure (2,0 sur 2).
- **La livraison** : la recherche perd 0,7 à 6 commandes de moins que la plus ancienne, et gagne +0,4 à +2,2 plats sur
  la meilleure règle (le plat le plus rapide).
- **La brigade avec plonge** donne le plus grand écart mesuré : +10,1 plats sans humain (24,5 contre 14,4), +3,0 sur
  le plat le plus rapide.
- **Avec un humain fatigué, en pause et qui se trompe, ou des robots en panne**, la recherche garde son avance : +5
  dans la grande brigade, +2 au grand détour, +0,8 dans la petite cuisine. Contre la référence, les limites de l'humain
  coûtent environ un plat (près de deux au grand détour), les pannes moins d'un plat, aux règles comme à la recherche.
- **La référence (27/10, la carte sur 50 services)** : la recherche est la meilleure dans les 27 mesures, de +0,4
  (couloir) à +3,1 (grande brigade) sur la meilleure règle avec « le plus urgent ».
- **Ce qui ne paie pas** : l'aboyeur coûte 0,8 plat à la recherche au grand détour, et la mise en place y coûte 1,9
  plat aux règles comme à la recherche ; elle n'apporte presque rien ailleurs. **Ce qui paie** : la coupe en série au
  passe-plats (+3,4) et aux postes (+1,8). La plonge coûte 1,2 à 1,5 plat dans la grande brigade.

## Avant et après la correction, sur les mêmes jobs

73 jobs du soir avaient fini sur l'ancien code (lancés avant 20 h 55, tag `2026-10-26-soir`). Ils jouent les mêmes
services que ceux de la nuit. Écart moyen des plats à temps, de l'ancien code au nouveau :

| Famille | jobs | la meilleure règle | la recherche |
|---|---|---|---|
| tables | 23 | +0,27 | +0,45 |
| banquet | 15 | +0,21 | +0,37 |
| livraison | 15 | +0,40 | +0,38 |
| mise en place | 3 | +1,73 | +1,27 |
| coupe en série | 4 | **−1,53** | −0,27 |
| banquet dur | 4 | +1,85 | +0,92 |
| dark kitchen, plonge, limites, pannes, aboyeur | 9 | +0,3 à +0,8 | +0,1 à +0,5 |

- **La correction aide surtout là où l'on cuit beaucoup** : la mise en place et le banquet dur (jusqu'à +7,4 pour la
  meilleure règle au passe-plats, de 1,8 à 9,2).
- **Elle n'enlève rien à l'avance de la recherche** : celle-ci gagne autant que les règles, ou un peu plus.
- **Exception : la coupe en série**, où les règles perdent (passe-plats 9,3 → 6,1, postes 10,5 → 7,6) et la
  recherche ne bouge pas. Hypothèse : l'ancien défaut gênait parfois au bon moment. Un robot planté devant un
  fourneau retardait le lancement d'un lot qui serait mort au chaud. La recherche, qui voit l'envoi, n'en avait pas
  besoin.

## Les tables

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | tables à temps (anc → rech) | morts au passe (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| en couloir | le plus proche | 0,6 | **1,1** | 0,7 | 0,7 | **1,1** | +0,47 (0,02 à 0,91) | 0,3 → 0,5 / 5,8 | 10,7 → 9,5 |
| en couloir | le plus urgent | 0,4 | 0,4 | 0,5 | 0,5 | **0,6** | +0,20 (-0,14 à 0,54) | 0,2 → 0,3 / 5,8 | 9,4 → 7,4 |
| en couloir | au hasard | 0,5 | 0,6 | 0,4 | 0,5 | **0,9** | +0,40 (0,05 à 0,75) | 0,2 → 0,4 / 5,8 | 7,0 → 5,0 |
| en couloir | suit sa table | **0,7** | **0,7** | 0,5 | **0,7** | **0,7** | +0,07 (-0,33 à 0,46) | 0,3 → 0,4 / 5,8 | 8,4 → 4,5 |
| en couloir | sans humain | **0,0** | **0,0** | **0,0** | **0,0** | **0,0** | +0,00 (0,00 à 0,00) | 0,0 → 0,0 / 5,8 | 6,0 → 3,5 |
| passe-plats | le plus proche | 1,9 | 2,0 | 2,7 | 1,8 | **5,7** | +3,87 (2,50 à 5,24) | 0,9 → 2,5 / 6,5 | 13,9 → 8,1 |
| passe-plats | le plus urgent | 1,7 | 1,8 | 2,7 | 1,8 | **5,8** | +4,03 (2,41 à 5,66) | 0,8 → 2,5 / 6,5 | 12,0 → 7,3 |
| passe-plats | au hasard | 2,0 | 2,0 | 2,9 | 1,9 | **3,7** | +1,73 (0,81 à 2,65) | 0,9 → 1,7 / 6,5 | 11,9 → 9,6 |
| passe-plats | suit sa table | 2,6 | 2,6 | 3,4 | 2,9 | **5,8** | +3,20 (2,11 à 4,29) | 1,2 → 2,6 / 6,5 | 10,3 → 7,3 |
| passe-plats | sans humain | 0,7 | 0,8 | 1,0 | 0,6 | **2,3** | +1,60 (0,89 à 2,31) | 0,4 → 1,1 / 6,5 | 9,9 → 6,8 |
| postes | le plus proche | 2,1 | 2,2 | 2,1 | 2,0 | **5,2** | +3,07 (1,73 à 4,41) | 1,0 → 2,4 / 8,3 | 16,5 → 12,0 |
| postes | le plus urgent | 2,3 | 2,2 | 1,8 | 2,5 | **5,5** | +3,20 (2,04 à 4,36) | 1,1 → 2,5 / 8,3 | 14,7 → 11,2 |
| postes | au hasard | 2,4 | 2,1 | 2,0 | 2,2 | **5,3** | +2,97 (1,84 à 4,09) | 1,1 → 2,4 / 8,3 | 15,9 → 12,0 |
| postes | suit sa table | 3,7 | 3,5 | 3,5 | 4,0 | **6,9** | +3,20 (1,92 à 4,48) | 1,6 → 3,0 / 8,3 | 12,4 → 9,0 |
| postes | sans humain | 0,9 | 0,9 | 1,5 | 0,9 | **2,1** | +1,20 (0,53 à 1,87) | 0,4 → 1,0 / 8,3 | 11,3 → 7,6 |
| coupée en deux | le plus proche | 1,6 | 2,6 | 2,1 | 1,1 | **4,2** | +2,53 (1,19 à 3,88) | 0,8 → 1,8 / 8,3 | 17,6 → 13,7 |
| coupée en deux | le plus urgent | 1,9 | 2,6 | 2,1 | 1,6 | **4,7** | +2,80 (1,52 à 4,08) | 0,9 → 2,0 / 8,3 | 17,9 → 12,9 |
| coupée en deux | au hasard | 1,5 | 1,8 | 1,7 | 1,4 | **2,9** | +1,40 (0,40 à 2,40) | 0,7 → 1,4 / 8,3 | 21,0 → 15,5 |
| coupée en deux | suit sa table | 1,7 | 2,6 | 2,1 | 1,3 | **4,8** | +3,10 (1,70 à 4,50) | 0,8 → 2,1 / 8,3 | 17,7 → 13,3 |
| coupée en deux | sans humain | 0,5 | 0,5 | 0,4 | 0,3 | **0,9** | +0,40 (0,11 à 0,69) | 0,2 → 0,4 / 8,3 | 11,0 → 4,4 |
| grande brigade | le plus proche | 4,2 | 4,4 | 5,3 | 4,3 | **11,3** | +7,13 (4,84 à 9,43) | 1,9 → 4,9 / 14,3 | 20,6 → 14,2 |
| grande brigade | au hasard | 4,1 | 4,1 | 7,2 | 3,8 | **10,6** | +6,47 (4,72 à 8,21) | 1,9 → 4,6 / 14,3 | 20,7 → 13,6 |
| grande brigade | sans humain | 3,1 | 3,8 | 5,2 | 3,6 | **8,1** | +4,97 (3,58 à 6,35) | 1,4 → 3,5 / 14,3 | 16,7 → 11,0 |

- Les tables à temps sont rares pour tous, mais la recherche en sert **deux à trois fois plus** que la plus ancienne, et
  laisse moins de plats mourir au passe.
- La règle de la table n'aide vraiment que dans le passe-plats et la grande brigade (+0,8 à +3,1 sur la plus
  ancienne). Dans les postes et la coupée en deux, avec un humain, elle fait à peine mieux, et parfois moins (postes,
  « le plus urgent » : −0,5).
- En couloir (un seul robot), personne ne fait mieux qu'un plat à temps : la cuisine est trop petite pour des tables.
- Manquent ici la grande brigade avec « le plus urgent » et « suit sa table », la petite cuisine et le grand détour
  (pas dans `night.json`). Les deux dernières sont dans la référence (plus bas).

## Le banquet

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | envois à l'heure (anc → rech) | retard max d'envoi (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| grande brigade | le plus proche | 5,3 | 5,3 | 5,3 | 5,6 | **9,8** | +4,47 (3,46 à 5,47) | 0,9 → 1,6 / 2 | 55,2 → 18,8 |
| grande brigade | le plus urgent | 5,3 | 5,3 | 5,3 | 5,6 | **10,0** | +4,67 (3,71 à 5,63) | 0,9 → 1,7 / 2 | 55,0 → 16,1 |
| grande brigade | au hasard | 5,3 | 5,3 | 5,3 | 7,3 | **8,8** | +3,47 (2,17 à 4,77) | 0,9 → 1,5 / 2 | 54,2 → 33,7 |
| grande brigade | suit sa table | 5,3 | 5,3 | 5,3 | **11,6** | 11,5 | +6,17 (5,41 à 6,92) | 0,9 → 1,9 / 2 | 58,7 → 3,2 |
| grande brigade | sans humain | 5,5 | 5,5 | 6,0 | 9,4 | **11,9** | +6,33 (5,49 à 7,18) | 0,9 → 2,0 / 2 | 60,1 → 0,6 |
| le grand détour | le plus proche | 7,3 | 7,3 | 9,2 | 5,9 | **9,3** | +1,97 (0,94 à 2,99) | 1,2 → 1,6 / 2 | 37,2 → 24,4 |
| le grand détour | le plus urgent | 8,6 | 8,6 | 9,4 | 6,7 | **10,8** | +2,17 (1,02 à 3,31) | 1,4 → 1,8 / 2 | 29,7 → 13,8 |
| le grand détour | au hasard | 5,5 | 4,7 | 6,0 | 4,6 | **6,3** | +0,83 (-0,33 à 2,00) | 1,0 → 1,1 / 2 | 45,7 → 39,7 |
| le grand détour | suit sa table | 7,4 | 7,4 | 6,6 | 8,1 | **9,0** | +1,60 (0,28 à 2,92) | 1,3 → 1,6 / 2 | 46,4 → 26,8 |
| le grand détour | sans humain | **3,3** | **3,3** | **3,3** | **3,3** | **3,3** | +0,00 (0,00 à 0,00) | 0,6 → 0,6 / 2 | 71,0 → 71,0 |
| en couloir | le plus proche | 5,4 | 5,4 | 5,1 | **5,7** | 5,6 | +0,20 (-0,81 à 1,21) | 0,9 → 1,0 / 2 | 66,6 → 66,6 |
| en couloir | le plus urgent | 5,4 | 5,4 | 5,1 | **5,7** | 5,6 | +0,20 (-0,81 à 1,21) | 0,9 → 1,0 / 2 | 66,7 → 66,6 |
| en couloir | au hasard | **0,8** | **0,8** | **0,8** | 0,7 | 0,7 | -0,07 (-0,64 à 0,50) | 0,1 → 0,1 / 2 | 112,0 → 114,0 |
| en couloir | suit sa table | 5,1 | 5,1 | 5,1 | **5,7** | 5,5 | +0,37 (-0,46 à 1,19) | 0,9 → 0,9 / 2 | 71,3 → 71,0 |
| en couloir | sans humain | **0,0** | **0,0** | **0,0** | **0,0** | **0,0** | +0,00 (0,00 à 0,00) | 0,0 → 0,0 / 2 | 131,8 → 131,8 |
| coupée en deux | le plus proche | 4,8 | 4,8 | 4,8 | 4,3 | **5,5** | +0,67 (0,05 à 1,29) | 0,8 → 1,0 / 2 | 34,5 → 46,6 |
| coupée en deux | le plus urgent | 4,8 | 4,8 | 4,8 | 4,3 | **5,5** | +0,67 (0,05 à 1,29) | 0,8 → 1,0 / 2 | 34,5 → 46,6 |
| coupée en deux | au hasard | 5,0 | 5,0 | 5,0 | 4,3 | **5,5** | +0,50 (-0,05 à 1,05) | 0,9 → 1,0 / 2 | 34,4 → 44,4 |
| coupée en deux | suit sa table | 4,8 | 4,8 | 4,8 | 4,3 | **5,5** | +0,67 (0,05 à 1,29) | 0,8 → 1,0 / 2 | 34,5 → 46,6 |
| coupée en deux | sans humain | 2,6 | 2,6 | 2,6 | 2,6 | **3,7** | +1,13 (0,30 à 1,96) | 0,5 → 0,7 / 2 | 85,6 → 84,9 |

- **Grande brigade : la recherche double les règles** (8,8 à 11,9 contre 5,3). Ses envois partent presque à l'heure :
  retard maximal de 0,6 à 34 tours, contre 54 à 60.
- **Avec un cuisinier qui suit le plan, le rétroplanning rejoint la recherche** (11,6 contre 11,5) : un humain qui
  fait ce que dit le plan rend la règle aussi bonne que la recherche. Sans humain, le rétroplanning fait 9,4.
- Au grand détour, la recherche gagne +0,8 à +2,2. La règle de la table la suit de près (9,2 et 9,4 avec « le plus
  proche » et « le plus urgent »).
- **En couloir et dans la coupée en deux, rien ne marche** : 5,7 plats à temps sur 12 au mieux, un envoi sur deux à
  l'heure. Un seul robot qui sert le feu ne peut pas tenir deux envois de six plats, un plat par voyage. C'est le
  rôle de la coupe en série.

## La coupe en série

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | envois à l'heure (anc → rech) | retard max d'envoi (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 5,7 | 5,7 | 5,7 | 6,3 | **10,4** | +4,70 (3,65 à 5,75) | 1,0 → 1,8 / 2 | 15,6 → 11,8 |
| passe-plats | le plus urgent | 6,1 | 6,1 | 5,9 | 5,8 | **11,9** | +5,77 (5,30 à 6,23) | 1,0 → 2,0 / 2 | 22,6 → 0,2 |
| postes | le plus urgent | 5,9 | 5,9 | 5,8 | 7,6 | **11,9** | +5,93 (5,39 à 6,47) | 1,0 → 2,0 / 2 | 15,8 → 1,0 |
| le grand détour | le plus urgent | 5,9 | 5,9 | 5,9 | 6,2 | **10,5** | +4,53 (3,59 à 5,48) | 1,0 → 1,8 / 2 | 28,1 → 9,4 |
| grande brigade | le plus urgent | 6,6 | 6,6 | 6,6 | 5,5 | **9,5** | +2,90 (1,84 à 3,96) | 1,1 → 1,6 / 2 | 16,7 → 16,0 |

- **La recherche fait partir les deux envois à l'heure** dans le passe-plats et les postes : 2,0 sur 2, retard
  maximal de 0,2 et 1,0 tour. Avec la plus ancienne, un envoi sur deux.
- Dans la grande brigade et au grand détour, la série n'ajoute rien à la recherche : 9,5 contre 10,0, et 10,5 contre
  10,8 sans série (le banquet ci-dessus, mêmes services). Quatre robots, ou un robot au passe, suffisaient déjà.
- Le banquet sans série de la petite cuisine, du passe-plats et des postes est dans la référence : c'est lui qui dira
  ce que la série y gagne.

## Le banquet dur

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | envois à l'heure (anc → rech) | retard max d'envoi (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 9,6 | 9,6 | 9,6 | 11,3 | **11,8** | +2,27 (1,00 à 3,53) | 1,2 → 1,5 / 2 | 11,5 → 6,4 |
| passe-plats | le plus urgent | 9,2 | 9,2 | 2,7 | 0,0 | **11,7** | +2,43 (1,08 à 3,79) | 1,2 → 1,5 / 2 | 12,8 → 9,0 |
| postes | le plus urgent | 10,3 | 10,3 | 10,3 | 11,3 | **12,9** | +2,60 (1,26 à 3,94) | 1,3 → 1,6 / 2 | 9,8 → 5,0 |
| le grand détour | le plus urgent | 9,2 | 9,2 | 0,2 | **15,9** | **15,9** | +6,63 (5,53 à 7,74) | 1,2 → 2,0 / 2 | 12,7 → 0,0 |
| grande brigade | le plus urgent | 11,6 | 11,6 | 11,6 | 9,4 | **11,8** | +0,23 (-0,22 à 0,69) | 1,5 → 1,5 / 2 | 6,5 → 6,7 |

- **Le premier calibrage du banquet passe.** Il faisait 0 plat à temps quand on servait un plat par voyage. La
  recherche y sert maintenant 11,7 à 15,9 plats à temps sur 16, contre 8 à 13 pour les règles d'après le journal,
  avant la correction.
- **Au grand détour, le rétroplanning et la recherche servent tout** : 15,9 sur 16, les deux envois à l'heure. La
  règle de la table, elle, ne sert presque rien (0,2). Elle lance la table la plus ancienne, et un plat qui attend
  plus de 30 tours meurt.
- **Au passe-plats, le rétroplanning ne sert rien** (0,0) et la table fait 2,7. Les mêmes règles se comportent à
  l'opposé d'une cuisine à l'autre.
- Dans la grande brigade, tout le monde fait de 9,4 à 11,8, et la recherche ne gagne pas (+0,2, intervalle sur 0) :
  le nombre de robots tient les envois.

## La livraison

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | partis sans plat (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| grande brigade | le plus proche | 19,2 | 21,0 | 19,2 | 18,7 | **23,6** | +4,37 (3,26 à 5,47) | 14,8 → 10,6 |
| grande brigade | le plus urgent | 19,1 | 21,0 | 19,1 | 18,2 | **23,2** | +4,17 (2,91 à 5,43) | 14,9 → 10,9 |
| grande brigade | au hasard | 19,1 | 21,4 | 19,1 | 17,9 | **23,0** | +3,93 (2,66 à 5,21) | 14,9 → 11,1 |
| grande brigade | suit sa table | 19,0 | 21,3 | 19,0 | 18,5 | **23,1** | +4,03 (2,59 à 5,47) | 14,9 → 11,1 |
| grande brigade | sans humain | 14,3 | 19,0 | 14,3 | 13,2 | **20,5** | +6,27 (4,42 à 8,12) | 19,7 → 13,5 |
| en couloir | le plus proche | 5,4 | 5,9 | 5,4 | 5,3 | **6,3** | +0,90 (0,32 à 1,48) | 7,6 → 6,8 |
| en couloir | le plus urgent | 5,1 | 5,5 | 5,1 | 4,7 | **5,9** | +0,77 (0,21 à 1,33) | 7,9 → 7,2 |
| en couloir | au hasard | 5,1 | 5,7 | 5,1 | 5,0 | **6,1** | +1,07 (0,56 à 1,57) | 8,0 → 7,0 |
| en couloir | suit sa table | 5,0 | 5,4 | 5,0 | 4,6 | **5,7** | +0,70 (0,00 à 1,40) | 8,1 → 7,4 |
| en couloir | sans humain | 3,7 | 6,0 | 3,7 | 2,9 | **6,4** | +2,70 (2,03 à 3,37) | 9,2 → 6,6 |
| coupée en deux | le plus proche | 11,0 | 11,0 | 11,0 | 10,5 | **13,2** | +2,27 (1,30 à 3,23) | 8,7 → 6,5 |
| coupée en deux | le plus urgent | 11,0 | 11,1 | 11,0 | 10,5 | **13,3** | +2,27 (1,25 à 3,29) | 8,6 → 6,5 |
| coupée en deux | au hasard | 10,7 | 11,0 | 10,7 | 10,2 | **12,9** | +2,20 (1,30 à 3,10) | 8,9 → 6,8 |
| coupée en deux | suit sa table | 10,9 | 11,0 | 10,9 | 10,4 | **13,0** | +2,13 (1,50 à 2,77) | 8,8 → 6,8 |
| coupée en deux | sans humain | 5,4 | 8,9 | 5,4 | 3,9 | **9,9** | +4,43 (3,33 à 5,53) | 14,1 → 9,8 |
| petite | suit sa table | 14,1 | 14,9 | 14,1 | 14,2 | **15,5** | +1,40 (0,87 à 1,93) | 5,6 → 4,3 |
| passe-plats | suit sa table | 10,1 | 10,2 | 10,1 | 9,5 | **11,1** | +1,00 (0,43 à 1,57) | 5,1 → 4,1 |
| postes | suit sa table | 12,5 | 12,7 | 12,5 | 12,1 | **13,8** | +1,23 (0,54 à 1,92) | 7,2 → 6,0 |
| le grand détour | suit sa table | 11,8 | 12,2 | 11,8 | 10,9 | **13,6** | +1,83 (1,04 à 2,63) | 7,9 → 6,2 |

- La recherche perd moins de commandes que toutes les règles, partout. Elle en perd 2 à 6 de moins que la plus
  ancienne dans la grande brigade et la coupée en deux.
- La meilleure règle y est le plat le plus rapide, et la recherche fait mieux qu'elle : +2,2 dans la grande brigade et
  dans la coupée en deux, +0,4 à +1,4 ailleurs.
- Sans humain, l'écart est le plus grand : +6,3 dans la grande brigade, +4,4 dans la coupée en deux.

## La dark kitchen et la brigade avec plonge

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | en retard (anc → rech) | manquées (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| dark kitchen | le plus urgent | 10,7 | 12,1 | 10,7 | 10,5 | **12,9** | +2,17 (1,26 à 3,07) | 0,0 → 0,0 | 9,2 → 7,0 |
| dark kitchen | suit sa table | 10,8 | 11,9 | 10,8 | 10,8 | **12,8** | +2,07 (1,19 à 2,94) | 0,0 → 0,0 | 9,1 → 7,0 |
| dark kitchen | sans humain | 6,4 | 9,5 | 6,4 | 5,7 | **10,5** | +4,13 (3,23 à 5,04) | 0,0 → 0,0 | 13,5 → 9,4 |
| brigade avec plonge | le plus urgent | 22,2 | 24,6 | 22,2 | 21,5 | **27,7** | +5,50 (3,70 à 7,30) | 6,5 → 1,7 | 5,6 → 4,9 |
| brigade avec plonge | sans humain | 14,4 | 21,5 | 14,4 | 13,6 | **24,5** | +10,10 (8,31 à 11,89) | 9,5 → 1,4 | 10,4 → 8,5 |

- **Dark kitchen** (livraison, emballage) : +0,8 à +1,0 sur le plat le plus rapide, la meilleure règle. Rien n'y est
  en retard : un plat livré part à temps ou pas du tout.
- **Brigade avec plonge** : la recherche fait 27,7 avec un humain, 24,5 sans, contre 24,6 et 21,5 pour le plat le plus
  rapide. Elle a presque supprimé les retards (1,4 à 1,7 contre 6,5 à 9,5).
- Contre la référence (plus bas) : la plonge coûte 1,2 à 1,5 plat dans la grande brigade ; l'emballage ne s'y lit
  pas, la dark kitchen ayant son propre plan.

## La fatigue, les pauses et les erreurs ; les pannes

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | en retard (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 17,2 | 16,9 | 17,2 | 16,1 | **18,0** | +0,87 (0,24 à 1,50) | 1,2 → 0,5 |
| le grand détour | le plus urgent | 13,9 | 14,5 | 13,9 | 12,5 | **15,9** | +2,03 (1,16 à 2,91) | 2,3 → 0,8 |
| grande brigade | le plus urgent | 22,5 | 25,4 | 22,5 | 22,2 | **28,0** | +5,47 (3,40 à 7,53) | 6,6 → 2,0 |

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | en retard (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 17,8 | 17,9 | 17,8 | 17,6 | **18,6** | +0,83 (0,24 à 1,43) | 1,0 → 0,4 |
| le grand détour | le plus urgent | 14,7 | 15,6 | 14,7 | 13,7 | **16,8** | +2,10 (0,98 à 3,22) | 2,3 → 1,2 |
| grande brigade | le plus urgent | 23,5 | 25,5 | 23,5 | 22,5 | **28,6** | +5,07 (3,12 à 7,01) | 6,0 → 2,1 |

- La recherche garde son avance : +5,1 à +5,5 dans la grande brigade (+2,6 et +3,1 sur le plat le plus rapide), +2 au
  grand détour, +0,8 dans la petite cuisine. Elle imagine la pause et la panne sans les connaître, et cela suffit.
- Contre la référence (plus bas) : les limites de l'humain coûtent environ un plat (près de deux au grand détour), les
  pannes 0,1 à 0,8 ; la recherche perd autant que les règles, ni plus ni moins.

## La mise en place

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | en retard (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| passe-plats | le plus urgent | 13,0 | 13,2 | 13,0 | 12,9 | **13,7** | +0,73 (0,10 à 1,36) | 1,2 → 0,8 |
| postes | le plus urgent | 16,9 | 16,9 | 16,9 | 15,6 | **18,2** | +1,27 (0,49 à 2,04) | 1,6 → 0,5 |
| le grand détour | le plus urgent | 12,6 | 14,4 | 12,6 | 11,7 | **15,4** | +2,80 (1,37 à 4,23) | 3,0 → 1,4 |

- La recherche gagne +0,7 à +2,8 avec la mise en place. Contre la référence (plus bas), la mise en place elle-même
  n'apporte rien au passe-plats, presque rien aux postes, et coûte deux plats au grand détour.
- C'est la famille que la correction a le plus changée (+1,7 pour les règles, +1,3 pour la recherche). Hypothèse : les
  soupes coupées d'avance attendaient souvent un fourneau barré par son veilleur.

## L'aboyeur

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | tables à temps (anc → rech) | morts au passe (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| le grand détour | le plus urgent | 3,6 | 3,7 | 8,4 | 3,3 | **10,9** | +7,33 (5,25 à 9,42) | 1,7 → 4,5 / 8,3 | 11,6 → 1,6 |

- Avec l'aboyeur, la recherche sert 4,5 tables sur 8,3 à temps, et ne laisse mourir que 1,6 plat au passe, contre 11,6
  avec la plus ancienne. La règle de la table fait 8,4 plats à temps.
- Sans l'aboyeur, sur les mêmes services (plus bas) : la recherche fait 11,7, l'aboyeur lui coûte donc 0,8 plat ;
  la règle de la table y gagne 0,6.

## La référence et la file de jour (27/10)

Deux fichiers de jobs, ajoutés le 27/10 :
- **`night-reference.json`** (tag `2026-10-27-reference`), 32 mesures. 31 ont fini. Les tables du grand détour ont été
  annulées le matin : elles étaient lentes, pas bloquées.
- **`night-complements.json`** (tag `2026-10-27-jour`), 7 mesures :
  - les tables du grand détour, refaites ;
  - les tables de la grande brigade avec « le plus urgent » et avec le cuisinier qui suit sa table ;
  - la rupture à 8 ingrédients dans la grande brigade.

Les sorties sont dans `~/.mcts-backlog/runs/*_cuis-*-2026-10-27-{reference,jour}.txt`. Ces mesures datent du 27/10 :
la correction du soir du 26/10 était faite, mais aucun des changements du 28/10 (l'arrêt anticipé par défaut, le
trajet direct). Ces changements laissent les plats à temps des règles identiques au dixième près ; ceux de la
recherche peuvent bouger un peu.

Comment comparer :
- **La carte se joue sur 50 services, les options sur 30.** On compare donc des moyennes, pas des paires, et sans
  intervalle. Pour donner l'échelle du bruit, la dark kitchen et la brigade avec plonge ont été jouées par la même
  commande sur 30 services (la nuit) et sur 50 (la référence). Leurs moyennes diffèrent de 0,2 à 0,5 plat. **Un écart
  de moins d'un demi-plat entre la carte et une option ne dit rien.**
- **L'aboyeur et la série se comparent sur les mêmes 30 services**, avec et sans : l'écart des moyennes est celui des
  paires, mais il n'a pas d'intervalle.

### Le service à la carte (50 services)

| Cuisine | Humain | commandes | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | en retard (anc → rech) | manquées (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 19,5 | 18,2 | 18,1 | 18,2 | 18,1 | **18,7** | +0,46 (0,13 à 0,79) | 0,5 → 0,2 | 0,8 → 0,6 |
| petite | au hasard | 19,5 | 17,2 | 17,3 | 17,2 | 17,4 | **18,5** | +1,34 (0,78 à 1,90) | 1,1 → 0,3 | 1,2 → 0,7 |
| petite | sans humain | 19,5 | 12,3 | 13,6 | 12,3 | 10,1 | **15,8** | +3,54 (2,64 à 4,44) | 3,4 → 0,5 | 3,8 → 3,2 |
| en couloir | le plus urgent | 13,0 | 9,0 | 9,4 | 9,0 | 7,4 | **9,8** | +0,80 (0,40 à 1,20) | 1,5 → 1,0 | 2,5 → 2,2 |
| en couloir | au hasard | 13,0 | 6,3 | 8,0 | 6,3 | 5,4 | **8,4** | +2,14 (1,41 à 2,87) | 2,0 → 0,8 | 4,8 → 3,8 |
| en couloir | sans humain | 13,0 | 5,1 | 7,4 | 5,1 | 2,7 | **8,2** | +3,12 (2,65 à 3,59) | 2,9 → 0,5 | 5,1 → 4,3 |
| grande brigade | le plus urgent | 33,7 | 24,8 | 26,3 | 24,8 | 24,1 | **29,4** | +4,56 (3,10 à 6,02) | 5,1 → 1,6 | 3,8 → 2,8 |
| grande brigade | au hasard | 33,7 | 23,6 | 25,4 | 23,6 | 23,7 | **29,0** | +5,34 (3,87 à 6,81) | 5,8 → 1,3 | 4,3 → 3,5 |
| grande brigade | sans humain | 33,7 | 18,0 | 22,5 | 18,0 | 17,7 | **26,2** | +8,16 (6,56 à 9,76) | 8,3 → 1,5 | 7,3 → 6,0 |
| passe-plats | le plus urgent | 14,9 | 13,0 | 13,1 | 13,0 | 12,9 | **13,6** | +0,62 (0,21 à 1,03) | 1,1 → 0,6 | 0,8 → 0,7 |
| passe-plats | au hasard | 14,9 | 12,2 | 12,6 | 12,2 | 12,2 | **13,2** | +0,96 (0,45 à 1,47) | 1,5 → 0,8 | 1,2 → 0,9 |
| passe-plats | sans humain | 14,9 | 7,2 | 7,8 | 7,2 | 7,0 | **10,1** | +2,90 (2,25 à 3,55) | 3,4 → 1,5 | 4,3 → 3,2 |
| postes | le plus urgent | 19,5 | 16,7 | 16,7 | 16,7 | 15,8 | **17,5** | +0,82 (0,39 à 1,25) | 1,3 → 0,7 | 1,5 → 1,2 |
| postes | au hasard | 19,5 | 16,1 | 16,1 | 16,1 | 15,7 | **17,0** | +0,92 (0,48 à 1,36) | 1,5 → 1,0 | 1,9 → 1,5 |
| postes | sans humain | 19,5 | 8,8 | 9,2 | 8,8 | 7,5 | **11,9** | +3,14 (2,38 à 3,90) | 4,4 → 1,6 | 6,3 → 5,9 |
| coupée en deux | le plus urgent | 19,5 | 15,2 | 14,3 | 15,2 | 13,9 | **16,6** | +1,44 (0,93 à 1,95) | 2,1 → 0,6 | 2,1 → 2,2 |
| coupée en deux | au hasard | 19,5 | 15,1 | 14,4 | 15,1 | 13,4 | **16,3** | +1,24 (0,82 à 1,66) | 2,3 → 0,7 | 2,1 → 2,4 |
| coupée en deux | sans humain | 19,5 | 6,5 | 10,6 | 6,5 | 3,3 | **11,9** | +5,40 (4,62 à 6,18) | 5,5 → 1,1 | 7,4 → 6,4 |
| le grand détour | le plus urgent | 19,5 | 15,6 | 16,3 | 15,6 | 14,5 | **17,3** | +1,76 (0,99 à 2,53) | 1,7 → 0,8 | 2,2 → 1,3 |
| le grand détour | au hasard | 19,5 | 11,9 | 14,0 | 11,9 | 11,1 | **15,5** | +3,62 (2,48 à 4,76) | 3,0 → 1,1 | 4,6 → 2,8 |
| le grand détour | sans humain | 19,5 | 5,2 | 9,8 | 5,2 | 3,7 | **10,7** | +5,50 (4,85 à 6,15) | 3,0 → 1,8 | 11,3 → 7,0 |
| dark kitchen | le plus urgent | 19,5 | 11,4 | 12,4 | 11,4 | 11,2 | **13,3** | +1,90 (1,29 à 2,51) | 0,0 → 0,0 | 8,1 → 6,2 |
| dark kitchen | au hasard | 19,5 | 11,5 | 12,4 | 11,5 | 11,5 | **13,2** | +1,64 (0,94 à 2,34) | 0,0 → 0,0 | 7,9 → 6,3 |
| dark kitchen | sans humain | 19,5 | 6,7 | 9,9 | 6,7 | 6,1 | **10,8** | +4,10 (3,40 à 4,80) | 0,0 → 0,0 | 12,8 → 8,7 |
| brigade avec plonge | le plus urgent | 33,7 | 23,4 | 25,1 | 23,4 | 22,7 | **27,9** | +4,46 (3,15 à 5,77) | 5,5 → 1,7 | 4,8 → 4,1 |
| brigade avec plonge | au hasard | 33,7 | 21,5 | 24,4 | 21,5 | 21,7 | **27,2** | +5,68 (4,25 à 7,11) | 6,0 → 1,3 | 6,1 → 5,1 |
| brigade avec plonge | sans humain | 33,7 | 15,9 | 21,7 | 15,9 | 15,6 | **24,9** | +9,00 (7,62 à 10,38) | 8,2 → 1,3 | 9,6 → 7,5 |

- **La recherche est la meilleure dans les 27 mesures.** Son avance sur la meilleure règle (le plus souvent le plat
  le plus rapide), avec « le plus urgent » :
  - grande brigade : +3,1 ;
  - brigade avec plonge : +2,8 ;
  - coupée en deux : +1,4 ;
  - grand détour : +1,0 ;
  - dark kitchen : +0,9 ;
  - postes : +0,8 ;
  - petite et passe-plats : +0,5 ;
  - couloir : +0,4.
- **Sans humain, l'avance est la plus grande** : +2,2 à +3,7, sauf au couloir, au détour, dans la coupée en deux et
  dans la dark kitchen (+0,8 à +1,3). C'est sans humain que les robots ont le plus à décider.
- **Les retards fondent avec la recherche** : 1,6 contre 5,1 dans la grande brigade, 0,5 contre 3,4 dans la petite
  cuisine sans humain.

### Ce que coûtent les options, contre la carte (« le plus urgent »)

| Option | Cuisine | meilleure règle (carte → option) | recherche (carte → option) |
|---|---|---|---|
| fatigue, pauses, erreurs | petite | 18,2 → 17,2 (−1,0) | 18,7 → 18,0 (−0,7) |
| fatigue, pauses, erreurs | le grand détour | 16,3 → 14,5 (−1,8) | 17,3 → 15,9 (−1,4) |
| fatigue, pauses, erreurs | grande brigade | 26,3 → 25,4 (−0,9) | 29,4 → 28,0 (−1,4) |
| pannes | petite | 18,2 → 17,9 (−0,3) | 18,7 → 18,6 (−0,1) |
| pannes | le grand détour | 16,3 → 15,6 (−0,7) | 17,3 → 16,8 (−0,5) |
| pannes | grande brigade | 26,3 → 25,5 (−0,8) | 29,4 → 28,6 (−0,8) |
| mise en place | passe-plats | 13,1 → 13,2 (+0,1) | 13,6 → 13,7 (+0,1) |
| mise en place | postes | 16,7 → 16,9 (+0,2) | 17,5 → 18,2 (+0,7) |
| mise en place | le grand détour | 16,3 → 14,4 (**−1,9**) | 17,3 → 15,4 (**−1,9**) |
| la plonge (contre la grande brigade, 50 services chacune) | grande brigade | 26,3 → 25,1 (−1,2) | 29,4 → 27,9 (−1,5) |

- **Les limites de l'humain coûtent un plat environ**, et près de deux au grand détour. La recherche n'y résiste ni
  mieux ni moins bien que les règles : elle perd autant, et garde son avance.
- **Les pannes coûtent moins** (−0,1 à −0,8) : un robot arrêté 10 tours tous les 5 services environ.
- **La mise en place n'apporte rien au passe-plats, presque rien aux postes, et coûte deux plats au grand détour**,
  aux règles comme à la recherche. L'écart dépasse le bruit (−1,9 contre ±0,5). Hypothèse, à vérifier sur un replay :
  dans le détour, le robot qui coupe d'avance part loin du feu, et la soupe qu'il prépare occupe un comptoir de relais
  dont les autres ont besoin. Le 26/10, avant la correction, elle aidait la coupée en deux (+1,4), qui n'a pas été
  remesurée.
- **La plonge coûte 1,2 à 1,5 plat** dans la grande brigade. Les deux cuisines ont le même nombre de commandes
  (33,7 par service).
- **Ce que coûte l'emballage ne se lit pas ici** : la dark kitchen a son propre plan, et il n'existe pas de service à
  la carte du même plan sans livraison.

### L'aboyeur et la coupe en série, sur les mêmes 30 services

| Mesure | Cuisine | meilleure règle (sans → avec) | recherche (sans → avec) | indicateur de la recherche (sans → avec) |
|---|---|---|---|---|
| l'aboyeur (avec tables) | le grand détour | 7,8 → 8,4 (+0,6, la table) | 11,7 → 10,9 (−0,8) | tables à temps 4,8 → 4,5 sur 8,3 ; morts au passe 1,7 → 1,6 |
| la série (lots de 3) | petite | 6,5 → 6,3 (−0,2) | 11,1 → 10,4 (−0,7) | envois à l'heure 1,9 → 1,8 sur 2 |
| la série (lots de 3) | passe-plats | 5,2 → 6,1 (+0,9) | 8,5 → 11,9 (**+3,4**) | envois à l'heure 1,5 → 2,0 sur 2 |
| la série (lots de 3) | postes | 5,9 → 7,6 (+1,7) | 10,1 → 11,9 (**+1,8**) | envois à l'heure 1,7 → 2,0 sur 2 |

- **L'aboyeur ne rapporte rien à la recherche au grand détour** (−0,8) : un robot de moins aux fourneaux pèse plus
  que l'appel des plats, que la recherche fait déjà. La règle de la table, elle, y gagne un peu (+0,6).
- **La coupe en série paie là où l'on coupe loin du feu** : +3,4 au passe-plats et +1,8 aux postes pour la recherche,
  avec les deux envois à l'heure. Dans la petite cuisine, où tout est proche, elle ne change rien.

### Les tables (30 services)

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | tables à temps (anc → rech) | morts au passe (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 4,9 | 3,6 | 4,4 | 5,7 | **9,1** | +4,13 (2,54 à 5,72) | 2,2 → 3,8 / 8,3 | 12,5 → 7,7 |
| le grand détour | le plus urgent | 4,1 | 3,5 | 7,8 | 3,7 | **11,7** | +7,60 (5,98 à 9,22) | 1,8 → 4,8 / 8,3 | 11,8 → 1,7 |
| grande brigade | le plus urgent | 4,7 | 4,1 | 6,7 | 5,1 | **12,3** | +7,53 (5,57 à 9,49) | 2,1 → 5,2 / 14,3 | 19,5 → 11,7 |
| grande brigade | suit sa table | 3,9 | 4,2 | 7,6 | 4,5 | **11,6** | +7,73 (5,39 à 10,08) | 1,8 → 5,0 / 14,3 | 20,2 → 11,6 |

- **La grande brigade, avec « le plus urgent » et avec le cuisinier qui suit sa table**, manquait à la nuit. La
  recherche y fait 12,3 et 11,6 plats à temps, contre 6,7 et 7,6 pour la table (+5,6 et +4,0), et sert 5,0 à 5,2
  tables à temps sur 14,3 au lieu de 1,8 à 2,1.
- **Le grand détour** : 11,7 contre 7,8 pour la table, et 1,7 plat mort au passe contre 11,8 pour la plus ancienne.
- **La petite cuisine** : 9,1 contre 5,7 pour le rétroplanning. C'est la seule cuisine mesurée ici où le
  rétroplanning est la meilleure règle avec des tables.

### Le banquet sans série (30 services)

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | envois à l'heure (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| petite | le plus urgent | 5,7 | 5,7 | 6,1 | 6,5 | **11,1** | +5,47 (4,32 à 6,61) | 0,9 → 1,9 / 2 |
| passe-plats | le plus urgent | 1,3 | 1,3 | 1,7 | 5,2 | **8,5** | +7,13 (5,79 à 8,47) | 0,3 → 1,5 / 2 |
| postes | le plus urgent | 5,9 | 5,3 | 2,8 | 5,4 | **10,1** | +4,17 (2,71 à 5,62) | 1,0 → 1,7 / 2 |

- **La recherche double les règles** : 11,1 contre 6,5 dans la petite cuisine, 8,5 contre 5,2 au passe-plats, 10,1
  contre 5,9 aux postes. Au passe-plats, la meilleure règle est le rétroplanning ; les trois autres font 1,3 à 1,7.

### La rupture à 8 ingrédients (grande brigade, 30 services)

| Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | refusées (anc → rech) | manquées (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| le plus proche | 15,4 | 14,8 | 15,4 | 15,5 | **15,7** | +0,37 (0,13 à 0,61) | 18,5 → 18,6 | 0,0 → 0,0 |
| le plus urgent | 15,4 | 14,9 | 15,4 | 15,5 | **15,7** | +0,27 (0,04 à 0,50) | 18,6 → 18,6 | 0,0 → 0,0 |
| au hasard | 15,2 | 14,9 | 15,2 | 15,2 | **15,6** | +0,37 (0,06 à 0,67) | 18,7 → 18,7 | 0,0 → 0,0 |
| sans humain | 14,1 | 13,6 | 14,1 | 14,1 | **15,4** | +1,33 (0,64 à 2,03) | 18,6 → 18,5 | 0,0 → 0,0 |

- **Le stock décide de tout** : 8 oignons et 8 tomates pour 34,3 commandes, 18,6 sont refusées, les mêmes quelle que
  soit la règle. Il reste environ 16 plats à faire, et toutes les règles en servent 15 environ à temps.
- La recherche y gagne peu (+0,3), sauf sans humain (+1,3). Ce réglage mesure la rupture, pas la cuisine.

## Les essais de mcts-commun (27/10 au soir)

mcts-commun a changé le soir du 27/10 (`a9a4c99`, `4abc577`) : A* borné, et deux réglages de la recherche, éteints
par défaut (`earlyStop`, `widening`), plus `diagnose`, qui dit ce qu'une recherche a vu. Sa session a demandé à la
cuisine de les essayer (`../mcts-commun/docs/essais-projets.md`).

### Les empreintes

`npm run check` passe, et les quatre empreintes n'ont pas bougé : le correctif d'A* rend les mêmes chemins, et les
réglages sont éteints.

### Le gain d'A*

Un service court, mesuré à la main sur les mêmes services avec trois versions de mcts-commun. Ce sont des copies dans
un dossier temporaire : `8ef17c6` avant tout correctif, `1c37ffc` le correctif du matin, `f78be75` celui du soir. La
cuisine est celle d'aujourd'hui, avec « le plus urgent ». Les trois versions ont tourné l'une après l'autre, parce que
la machine était chargée par ailleurs (des processus Java occupaient environ 9 cœurs). Les temps ne se comparent donc
pas à ceux du matin, mais se comparent entre eux. C'est la moyenne de deux passes, une seule pour la dernière ligne.

| Essai | Appels d'A* | A* avant | matin | soir | `givenUp` | `expanded / calls` |
|---|---|---|---|---|---|---|
| couloir, 3 services des règles | 1 998 | 5,6 s | 0,34 s | 0,37 s | 1 126 | 37,8 |
| couloir, 1 service de la recherche | 15 529 | 17,0 s | 2,2 s | 2,0 s | 7 731 | 33,9 |
| grand détour avec tables, 3 services des règles | 1 672 | 1,8 s | 0,36 s | 0,30 s | 48 | 20,0 |
| grand détour avec tables, 1 service de la recherche | 120 943 | 28,4 s | 8,1 s | 7,9 s | 887 | 8,9 |

- **Les mêmes chemins** : les trois versions font le même nombre d'appels, rendent `null` aussi souvent (`notFound`)
  et servent les mêmes plats à l'heure (couloir : 7,7 / 9 / 7,7 / 8 pour les quatre règles ; détour avec tables, la
  recherche 9 contre 2 pour la plus ancienne).
- **Le gain est celui du matin** : 4,6 s → 0,33 s, et 18,7 s → 8,0 s, comme le notait `1c37ffc`. Le correctif du soir
  ne change presque rien dans la cuisine, dont les plans sont petits : il compte sur les plans larges de l'entrepôt.
- **Ce que coûte un appel** : 9 à 38 cases explorées en moyenne. En couloir, un appel sur deux est encore un `null`,
  mais il est rendu tôt (`givenUp`).
- Ces essais ne changent ni les règles ni la recherche, ils ne mesurent que A*. La cuisine compte 120 943 appels pour un
  service de la recherche au grand détour avec tables : A* y fait encore 30 % du temps.

### Ce que dit `diagnose`

`node scripts/search-bench.js 2 toutes urgent "" --diagnose` : deux services par cuisine, « le plus urgent », les
codes rendus à chaque décision de la recherche (le budget du projet : 64 itérations, profondeur 2, largeur 4).

| Cuisine | Décisions | `fewIterations` | `flatScore` | `closeCall` | `shallow` |
|---|---|---|---|---|---|
| petite | 17 | 76 % | 18 % | 59 % | 6 % |
| en couloir | 7 | 71 % | 14 % | 71 % | 14 % |
| grande brigade | 32 | 78 % | 3 % | 72 % | 0 % |
| passe-plats | 9 | 11 % | 11 % | 78 % | 0 % |
| postes | 21 | 48 % | 19 % | 76 % | 0 % |
| coupée en deux | 22 | 23 % | 23 % | 59 % | 5 % |
| le grand détour | 14 | 64 % | 7 % | 71 % | 0 % |
| dark kitchen | 54 | 19 % | 4 % | 91 % | 0 % |
| brigade avec plonge | 36 | 72 % | 22 % | 61 % | 3 % |

- **`closeCall` domine** (59 à 91 % des décisions) : les deux premiers coups de la racine se valent à deux erreurs
  types près. Ce chiffre est **surévalué** (la réserve plus bas, « Ce que vaut `closeCall` »).
- **`fewIterations` vient ensuite**, partout où la racine a quatre ou cinq coups (la liste courte de 4, plus
  « attendre ») : 64 itérations, c'est 13 à 16 par coup, sous le seuil de 20. Les deux codes disent la même chose : le
  budget est court pour séparer les coups.
- **`shallow` est rare** (0 à 14 %) : l'arbre atteint presque toujours sa profondeur de 2. `widening` n'aurait pas de
  prise, comme le prévoyait mcts-commun (à profondeur 2 et largeur 4). Il n'est pas essayé.
- **`flatScore`** (3 à 23 %) : un quart des décisions au plus où tous les coups valent la même chose. Ce sont souvent
  des moments calmes : le score à l'horizon ne départage rien.
- **Le levier à travailler ensuite est donc le budget**, ou ce qui revient au même, un rollout plus rapide pour en
  faire plus dans le même temps. `earlyStop` peut y aider : les itérations qu'il épargne là où le choix est déjà fait
  pourraient servir aux décisions serrées. C'est `fewIterations` qui le dit le plus sûrement : 13 à 16 itérations
  par coup, c'est peu.

**Ce que vaut `closeCall`** (mcts-commun, réponse du 27/10 au soir sur le tableau des sessions, son commit `8d57d5a`).
Le code sort presque partout, dans la cuisine comme aux urgences et à l'entrepôt :
- **Sa marge d'erreur est trop large pour nous.** Elle prend chaque coup à part, avec la borne `p(1 − p)` sur la
  variance d'une moyenne. Or avec les mondes communs (`common`), les coups de la racine sont joués sur les mêmes mondes,
  et le bruit des mondes s'annule dans leur différence. L'écart réel entre deux coups est donc mieux connu que ne le
  croit `closeCall`, qui dit « à égalité » trop souvent.
- **Les pourcentages de `closeCall` sont donc des majorants**, pas la part réelle des décisions serrées. Ils ne
  disent pas que la recherche tire au sort entre deux coups.
- **Ce qui reste vrai** : le budget est court (`fewIterations`). La conclusion ne change pas, seul son appui principal
  passe de `closeCall` à `fewIterations`.
- mcts-commun l'a noté pour la lib (`docs/essais-projets.md`, « Ce qu'ils ont répondu ») : tel quel, `closeCall` dit
  peu. Les chiffres de la cuisine seront à relire si la lib le corrige.

Les jobs de la file donnent aussi ces codes, sur 30 services et toutes les familles (plus bas, « L'arrêt anticipé »).

### L'arrêt anticipé (`earlyStop`)

`npm run compare -- --search --arret-anticipe` joue, sur les mêmes services, la recherche telle qu'elle est et la
même recherche avec `earlyStop`. La file de jour du 27/10 au soir en a fait 16 mesures, de 30 services chacune, avec
« le plus urgent » :
- 64 jobs, tous finis, de 18 h 01 à 19 h 25, tag `essais-commun-2026-10-27` ;
- `essais-commun.json`, coupé par `npm run tranches -- essais-commun.json --arret-anticipe` ;
- les sorties dans `~/.mcts-backlog/runs/*_cuis-*-arret-essais-commun-2026-10-27.txt`.

| Famille | Cuisine | à temps (recherche) | arrêt anticipé contre la recherche : à temps | en retard | itérations par décision | itérations | durée de la recherche |
|---|---|---|---|---|---|---|---|
| à la carte | petite | 18,8 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 49,9 | −22 % | −23 % |
| à la carte | en couloir | 9,1 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 46,5 | −27 % | −31 % |
| à la carte | grande brigade | 29,0 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 50,0 | −22 % | −23 % |
| à la carte | passe-plats | 13,8 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 46,2 | −28 % | −31 % |
| à la carte | postes | 17,3 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 47,6 | −26 % | −28 % |
| à la carte | coupée en deux | 16,3 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 49,7 | −22 % | −24 % |
| à la carte | le grand détour | 17,2 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 48,3 | −25 % | −25 % |
| à la carte | dark kitchen | 12,9 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 48,1 | −25 % | −24 % |
| à la carte | brigade avec plonge | 27,8 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 50,0 | −22 % | −23 % |
| tables | petite | 9,1 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 50,9 | −20 % | −23 % |
| tables | en couloir | 0,6 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 54,8 | −14 % | −15 % |
| tables | le grand détour | 11,7 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 49,3 | −23 % | −21 % |
| tables | grande brigade | 12,3 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 50,2 | −22 % | −23 % |
| banquet | petite | 11,1 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 55,8 | −13 % | −11 % |
| banquet | grande brigade | 10,0 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 53,3 | −17 % | −24 % |
| livraison | grande brigade | 23,1 | +0,00 (0,00 à 0,00) | +0,00 (0,00 à 0,00) | 64,0 → 49,0 | −23 % | −25 % |

- **Les mêmes plats, au service près.** Dans les 16 mesures, aucune paire ne diffère : les plats à temps, les retards
  et toutes les autres colonnes sont identiques. L'intervalle vaut 0,00 à 0,00.
- **La raison** : l'arrêt anticipé rend le même coup, et dans la cuisine, chaque décision tire son hasard d'une
  graine qui ne dépend que du tour et du robot (`searchRule`). Le hasard que la recherche n'a pas consommé ne se
  reporte pas sur la suite du service.
- **Ce qu'il épargne** : de 13 à 28 % des itérations, sur 13 521 décisions. Il épargne le moins au banquet et aux
  tables en couloir, où le coup en tête se détache plus tard.
- **Le temps se lit avec prudence** : 11 à 31 % de moins, 23 % sur l'ensemble (493 min contre 380). Mais dans
  `compare`, la recherche avec l'arrêt anticipé est toujours jouée après l'autre, sur un code déjà chaud, ce qui
  l'avantage (mcts-commun, `8d57d5a`). L'épargne se juge aux itérations.
- **Les empreintes ne bougent pas.** Une copie de la cuisine avec `earlyStop` allumé par défaut passait déjà
  `tests/fingerprint.test.js`. Ce test voit pourtant bien un changement de la recherche : `width: 2` fait bouger
  l'empreinte de la recherche.
- **Allumé par défaut depuis le 27/10 au soir** (Sami : « lance les tests avec earlystop ») : `earlyStop: true` dans
  `SEARCH_SETTINGS` (`src/search.js`). `npm run check` passe, et les quatre empreintes restent les mêmes.
  Depuis, `--arret-anticipe` joue la recherche **sans** l'arrêt anticipé (comme avant) à côté de la recherche par
  défaut, pour refaire la paire au besoin.

Les codes de `diagnose` sur ces 30 services, pour la recherche telle qu'elle est (et `fewIterations` avec l'arrêt
anticipé, qui fait moins d'itérations par décision) :

| Famille | Cuisine | Décisions | `fewIterations` | `flatScore` | `closeCall` | `shallow` | `fewIterations` avec l'arrêt anticipé |
|---|---|---|---|---|---|---|---|
| à la carte | petite | 241 | 38 % | 9 % | 76 % | 1 % | 64 % |
| à la carte | en couloir | 175 | 50 % | 10 % | 72 % | 9 % | 80 % |
| à la carte | grande brigade | 656 | 66 % | 13 % | 71 % | 1 % | 83 % |
| à la carte | passe-plats | 129 | 15 % | 9 % | 74 % | 1 % | 60 % |
| à la carte | postes | 277 | 24 % | 13 % | 70 % | 1 % | 65 % |
| à la carte | coupée en deux | 362 | 27 % | 16 % | 71 % | 4 % | 64 % |
| à la carte | le grand détour | 216 | 47 % | 12 % | 69 % | 0 % | 75 % |
| à la carte | dark kitchen | 738 | 21 % | 2 % | 87 % | 0 % | 53 % |
| à la carte | brigade avec plonge | 656 | 64 % | 13 % | 71 % | 2 % | 82 % |
| tables | petite | 879 | 47 % | 23 % | 62 % | 0 % | 73 % |
| tables | en couloir | 383 | 54 % | 29 % | 62 % | 0 % | 74 % |
| tables | le grand détour | 2083 | 16 % | 21 % | 56 % | 0 % | 53 % |
| tables | grande brigade | 1811 | 54 % | 19 % | 63 % | 0 % | 76 % |
| banquet | petite | 843 | 84 % | 45 % | 44 % | 0 % | 85 % |
| banquet | grande brigade | 2472 | 84 % | 46 % | 34 % | 0 % | 87 % |
| livraison | grande brigade | 1600 | 33 % | 1 % | 87 % | 0 % | 62 % |

- **`closeCall` domine** à la carte, aux tables et à la livraison (56 à 87 %), comme dans le bench. Ce sont des
  majorants (« Ce que vaut `closeCall` », plus haut).
- **Au banquet, c'est `fewIterations`** (84 %) et **`flatScore`** (45 et 46 %) : la recherche y a beaucoup de coups,
  et près d'une décision sur deux ne voit aucune différence entre eux à l'horizon. Pour le banquet, le levier serait
  le score (un retard d'envoi gradué), plus que le budget.
- **`shallow`** ne dépasse 4 % qu'à la carte en couloir (9 %) : `widening` ne vaut pas d'être essayé.
- Avec l'arrêt anticipé, `fewIterations` monte (53 à 87 %) : il compte les itérations faites. Ce n'est pas un défaut,
  puisque le coup est déjà décidé quand il s'arrête. mcts-commun l'a noté aussi : depuis que `earlyStop` est le
  défaut, `fewIterations` se lit sur une recherche sans lui (`--arret-anticipe`, la ligne « recherche (ISMCTS) »).

### Les cases réservées deux fois

Les traces de la file, au 27/10 vers 18 h :
- **les 32 jobs de cuisine lancés depuis 11 h** (les essais de la file, les compléments de jour), sur le code corrigé
  le matin (`87a775c`, « Plus de cuisiniers l'un sur l'autre ») : `grid.overbooked` vaut 0 partout, et
  `overbookedInClone` aussi ;
- **les jobs de la référence lancés vers 9 h**, avant ce correctif, en comptaient 873. Le compteur des clones n'existait
  pas encore (mcts-commun `8ef17c6`, 10 h 23). Le balayage de 9 000 services du matin les avait placés dans le vrai
  service : c'était le défaut du modèle de cuisine (`holdHere`), 14 cases réservées deux fois avant, 0 après.

Plus aucune réservation double, ni dans le service ni dans les mondes de la recherche.
