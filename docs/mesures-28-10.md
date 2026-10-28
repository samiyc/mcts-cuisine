# Les mesures de la file du 28/10

La file de jour lancée par Sami le 28/10 à 18 h 31, après le passage de tous les projets à la lib du 28/10 (commun
`684c3ad`, puis `6ad78f0`) et à Node 24.22.1 (`docs/metiers.md`, « La lib du 28/10 »). Les 130 jobs de cuisine ont
fini vers 19 h 05, sans échec, sur le code de `1757299`. Trois fichiers, trois tags :

- `essais-diagnose.json` (`diagnose-2026-10-28`) : la répartition des codes de `diagnose` de mcts-commun, corrigé le
  27/10 (`a2c66bd`), sur 10 services de 13 réglages ;
- `essais-croisement.json` (`croisement-2026-10-28-p2`) : les cuisiniers qui se croisent, deux par case d'allée, contre
  le modèle par défaut, sur 30 services de 12 réglages ;
- `essais-budget-grace.json` (`budget-grace-2026-10-28-p2`) : 128 itérations contre 64, et la note graduée (`grace=30`)
  contre la note par défaut, par paires sur les mêmes 30 services.

Partout le cuisinier « le plus urgent » ; la recherche avec ses réglages par défaut (64 itérations, l'arrêt
anticipé). Les sorties : `~/.mcts-backlog/runs/*_cuis-*-{diagnose-2026-10-28,croisement-2026-10-28-p2,budget-grace-2026-10-28-p2}.txt`.

## Les durées

Les jobs ont pris 8 à 20 fois moins que leurs estimations, apprises avant les gains du 28/10 (les distances gardées, le
trajet direct, le cuisinier enfermé, l'A* de la lib) : 30 services de la grande brigade à la carte, avec les quatre
règles et la recherche, en 1,5 min ; les tables de la grande brigade, les plus longues, en 5 min. La file l'a appris
au fil des jobs (« les derniers jobs en ont pris ×0,12 »).

## Le diagnose (10 services)

| Réglage | décisions | itérations | arrêtées tôt | fewIterations | flatScore | closeCall | shallow |
|---|---|---|---|---|---|---|---|
| petite, carte | 74 | 49,4 | 81 % | 8 % | 9 % | 70 % | 1 % |
| couloir, carte | 51 | 46,3 | 82 % | 12 % | 10 % | 67 % | 8 % |
| grande brigade, carte | 199 | 50,0 | 78 % | 15 % | 11 % | 74 % | 1 % |
| passe-plats, carte | 32 | 48,4 | 81 % | 0 % | 13 % | 66 % | 0 % |
| postes, carte | 88 | 46,4 | 85 % | 3 % | 13 % | 63 % | 2 % |
| coupée en deux, carte | 107 | 49,6 | 76 % | 5 % | 13 % | 56 % | 4 % |
| grand détour, carte | 76 | 48,4 | 83 % | 8 % | 11 % | 59 % | 0 % |
| dark kitchen, carte | 262 | 48,9 | 94 % | 1 % | 2 % | 87 % | 0 % |
| brigade avec plonge, carte | 211 | 50,1 | 80 % | 12 % | 12 % | 64 % | 2 % |
| grand détour, tables | 624 | 50,0 | 69 % | 6 % | 25 % | 66 % | 0 % |
| grande brigade, tables | 605 | 49,6 | 74 % | 21 % | 19 % | 74 % | 0 % |
| petite, banquet | 285 | 57,4 | 33 % | 52 % | 58 % | 37 % | 0 % |
| grande brigade, banquet (5 services) | 816 | 52,4 | 57 % | 30 % | 38 % | 49 % | 0 % |

- **`shallow` reste rare** (8 % au plus, au couloir) : l'élargissement de l'arbre n'a pas de raison d'être essayé.
- **Au banquet, `fewIterations` et `flatScore`** dominent (30 à 58 %) : les mondes y finissent souvent tous de même,
  la note ne sépare pas les coups.
- **`closeCall` reste haut (37 à 87 %) alors que la plupart des décisions sont arrêtées tôt** (le coup en tête ne
  peut plus être rattrapé) : 87 % de `closeCall` et 94 % d'arrêts tôt dans la dark kitchen. Avec 128 itérations
  (plus bas), `closeCall` ne baisse presque pas (74 → 64 % au plus). Ce sont des coups presque équivalents, où le choix
  importe peu ; le signal est envoyé à commun, qui tient `diagnose`.

## Les cuisiniers se croisent (30 services, deux par case d'allée)

Plats à temps, sans → avec l'option :

| Réglage | la plus rapide | la table | recherche | durée du job |
|---|---|---|---|---|
| petite, carte | 18,0 → 18,0 | 18,3 → 18,2 | 18,8 → 18,8 | 0,2 → 0,3 min |
| couloir, carte | 8,8 → 9,1 | 8,4 → 8,9 | 9,1 → 9,7 | 0,1 → 0,2 min |
| grande brigade, carte | 25,7 → 25,7 | 23,6 → 23,8 | 29,0 → 28,5 | 1,5 → 1,5 min |
| passe-plats, carte | 13,1 → 13,1 | 12,8 → 12,8 | 13,8 → 13,4 | 0,2 → 0,2 min |
| postes, carte | 16,4 → 16,5 | 16,3 → 16,3 | 17,3 → 17,1 | 0,3 → 0,4 min |
| coupée en deux, carte | 13,6 → 13,6 | 14,7 → 14,7 | 16,3 → 16,3 | 0,4 → 0,4 min |
| grand détour, carte | 15,7 → 15,7 | 14,8 → 14,8 | 17,2 → 17,3 | 0,2 → 0,3 min |
| dark kitchen, carte | 12,1 → 12,1 | 10,7 → 10,7 | 12,9 → 12,8 | 1,0 → 1,4 min |
| brigade avec plonge, carte | 24,6 → 24,8 | 22,2 → 22,4 | 27,8 → 27,3 | 1,5 → 1,3 min |
| couloir, tables | 0,4 → 0,5 | 0,5 → 0,5 | 0,6 → 0,7 | 0,8 → 0,3 min |
| grand détour, tables | 3,5 → 3,6 | 7,8 → 7,4 | 11,7 → 11,9 | 4,0 → 5,4 min |
| grande brigade, tables | 4,0 → 4,0 | 6,7 → 7,5 | 12,3 → 11,7 | 5,2 → 7,7 min |

(« la table » est la règle de la table, qui se réduit à la plus ancienne sans tables.)

- **L'option ne change presque rien** : au plus un demi-plat, dans un sens ou dans l'autre. Le couloir y gagne le
  plus (+0,3 à +0,6 plat, toutes règles), comme attendu là où les cuisiniers se bloquaient ; la recherche y perd un
  demi-plat dans les deux brigades. Ce sont des moyennes sur les mêmes services, sans intervalle : à cette taille,
  pas d'effet sûr.
- **Elle ne fait pas gagner de temps** : les jobs avec l'option durent autant, ou plus (les tables de la grande brigade
  5,2 → 7,7 min). Le temps que Sami espérait gagner l'a été par le trajet direct, pour tous.
- **Le modèle ne perd pas sa congestion** : le couloir et le détour restent les cuisines les plus dures.

## 128 itérations contre 64 (par paires, 30 services)

| Réglage | recherche (64) | à temps, 128 − 64 (IC 95 %) | en retard, 128 − 64 |
|---|---|---|---|
| petite, carte | 18,8 | +0,07 (−0,09 à 0,23) | −0,07 |
| couloir, carte | 9,1 | +0,00 (−0,19 à 0,19) | +0,00 |
| grande brigade, carte | 29,0 | −0,03 (−0,23 à 0,17) | −0,10 |
| passe-plats, carte | 13,8 | −0,03 (−0,10 à 0,03) | +0,00 |
| postes, carte | 17,3 | +0,07 (−0,16 à 0,30) | −0,03 |
| coupée en deux, carte | 16,3 | +0,00 (−0,38 à 0,38) | +0,00 |
| grand détour, carte | 17,2 | +0,30 (−0,01 à 0,61) | −0,20 |
| dark kitchen, carte | 12,9 | +0,13 (−0,28 à 0,55) | +0,00 |
| brigade avec plonge, carte | 27,8 | +0,00 (−0,30 à 0,30) | +0,07 |
| petite, tables | 9,1 | +0,17 (−0,45 à 0,78) | −0,80 |
| grand détour, tables | 11,7 | −0,17 (−1,20 à 0,86) | +0,30 |
| grande brigade, tables | 12,3 | **+2,20 (−0,17 à 4,57)** | −0,87 |
| petite, banquet | 11,1 | +0,00 (−0,47 à 0,47) | −0,17 |
| grande brigade, banquet | 10,0 | +0,20 (−0,49 à 0,89) | +0,00 |
| grande brigade, livraison | 23,1 | +0,13 (−0,62 à 0,89) | +0,00 |

- **Le double d'itérations (+84 à +103 %) double le temps de la recherche (+81 à +100 %) et ne sert presque nulle
  part** : tous les intervalles contiennent zéro, la plupart à moins d'un dixième de plat. Le bruit que Sami voyait
  partir sur lopin n'est pas là : chez cuisine, les décisions sont arrêtées tôt dans 3 cas sur 4 dès 64 itérations.
- **La seule exception est la grande brigade avec tables** : +2,2 plats, l'intervalle touchant presque zéro. C'est le
  réglage où `fewIterations` est le plus haut (21 %). À confirmer sur plus de services avant d'y changer le budget.

## La note graduée, grace=30 (par paires, 30 services)

Le banquet dur : 8 couverts par table, 30 tours au chaud, la coupe en lots de 3 (`--couverts 8 --chaud 30 --serie 3`).

| Réglage | recherche (sans) | à temps, grace − sans (IC 95 %) | en retard, grace − sans (IC 95 %) |
|---|---|---|---|
| banquet dur, petite | 9,6 | −0,57 (−1,83 à 0,70) | +0,57 (−0,70 à 1,83) |
| banquet dur, passe-plats | 8,7 | −0,30 (−0,89 à 0,29) | +0,30 (−0,29 à 0,89) |
| banquet dur, postes | 9,7 | +0,53 (−0,19 à 1,26) | −0,53 (−1,26 à 0,19) |
| banquet dur, coupée en deux | 13,3 | 0 | 0 |
| banquet dur, grand détour | 10,5 | +0,50 (−0,58 à 1,58) | +0,37 (−0,91 à 1,64) |
| banquet dur, grande brigade | 13,0 | **−2,37 (−3,69 à −1,04)** | **+2,87 (1,49 à 4,25)** |
| banquet, petite / grand détour / grande brigade | 11,1 / 10,8 / 10,0 | 0 | 0 |
| banquet, passe-plats | 8,8 | −0,50 (−1,83 à 0,83) | +0,93 (−0,39 à 2,26) |
| banquet, postes | 10,1 | −0,43 (−1,43 à 0,56) | +0,17 (−0,75 à 1,09) |
| grand détour, tables | 11,7 | −1,30 (−2,94 à 0,34) | **+2,03 (0,81 à 3,25)** |
| grande brigade, tables | 12,3 | −0,23 (−1,28 à 0,82) | **+3,70 (1,93 à 5,47)** |

- **La note graduée n'aide pas, et nuit parfois** : −2,4 plats à temps dans le banquet dur de la grande brigade, et
  2 à 4 plats en retard de plus avec des tables. Compter un plat en retard pousse la recherche à en servir en retard
  plutôt qu'à temps. Le +4 plats de l'essai à la main (2 services du banquet dur au grand détour, 28/10) ne tient pas
  sur 30 : +0,5, l'intervalle contenant zéro.
- **Là où elle ne change rien** (0, 0), tous les mondes finissent à temps ou tous de même : la note n'y entre pas.
