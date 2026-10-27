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
- **Avec un humain fatigué, en pause et qui se trompe, ou des robots en panne**, la recherche garde une avance du
  même ordre qu'au service ordinaire (mesuré le 26/10, avant la correction) : +5 dans la grande brigade, +2 au grand
  détour, +0,8 dans la petite cuisine.

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
- Ce que coûtent l'emballage et la plonge se lira contre la référence, le service à la carte des mêmes cuisines.

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
- Ce que coûtent ces limites, et si la recherche les supporte mieux que les règles, se lira contre la référence.

## La mise en place

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | en retard (anc → rech) |
|---|---|---|---|---|---|---|---|---|
| passe-plats | le plus urgent | 13,0 | 13,2 | 13,0 | 12,9 | **13,7** | +0,73 (0,10 à 1,36) | 1,2 → 0,8 |
| postes | le plus urgent | 16,9 | 16,9 | 16,9 | 15,6 | **18,2** | +1,27 (0,49 à 2,04) | 1,6 → 0,5 |
| le grand détour | le plus urgent | 12,6 | 14,4 | 12,6 | 11,7 | **15,4** | +2,80 (1,37 à 4,23) | 3,0 → 1,4 |

- La recherche gagne +0,7 à +2,8 avec la mise en place. Ce que la mise en place apporte elle-même se lira contre la
  référence.
- C'est la famille que la correction a le plus changée (+1,7 pour les règles, +1,3 pour la recherche). Hypothèse : les
  soupes coupées d'avance attendaient souvent un fourneau barré par son veilleur.

## L'aboyeur

| Cuisine | Humain | la plus ancienne | le plus rapide | la table | le rétroplanning | la recherche | gain de la recherche | tables à temps (anc → rech) | morts au passe (anc → rech) |
|---|---|---|---|---|---|---|---|---|---|
| le grand détour | le plus urgent | 3,6 | 3,7 | 8,4 | 3,3 | **10,9** | +7,33 (5,25 à 9,42) | 1,7 → 4,5 / 8,3 | 11,6 → 1,6 |

- Avec l'aboyeur, la recherche sert 4,5 tables sur 8,3 à temps, et ne laisse mourir que 1,6 plat au passe, contre 11,6
  avec la plus ancienne. La règle de la table fait 8,4 plats à temps.
- Le grand détour avec tables sans aboyeur est dans la référence : c'est lui qui dira ce que l'aboyeur apporte.

## La référence, dans la file

`night-reference.json` : tag `2026-10-27-reference`, 32 jobs, ajoutés le 27/10 au matin.
- **Le service à la carte** sur le code corrigé, 50 services, dans les neuf cuisines, avec « le plus urgent »,
  « au hasard » et sans humain. C'est la base pour dire ce que coûtent l'emballage, la plonge, les limites de l'humain
  et les pannes, ce qu'apporte la mise en place, et pour refaire le tableau des gains du journal.
- **Les tables** de la petite cuisine et du grand détour (« le plus urgent ») : pour l'aboyeur.
- **Le banquet sans série** de la petite cuisine, du passe-plats et des postes : pour la coupe en série.

Leurs résultats compléteront ce fichier.
