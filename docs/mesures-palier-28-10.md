# Le palier de la recherche (file du 28/10, au soir)

Demandé par commun le 28/10 (le « palier » de `docs/reglages.md` de mcts-commun) : quatre réglages de la recherche,
chacun joué contre les réglages par défaut (A : 64 itérations, profondeur 2, 4 coups par nœud, l'arrêt anticipé), par
paires sur les mêmes 30 services, le cuisinier « le plus urgent », dans 13 cuisines.

- **B** : `budget=256` ;
- **C** : `rootWidth=8` (8 coups à la racine, 4 en dessous) ;
- **D** : `depth=3,budget=128` ;
- **E** : tout ensemble, `budget=256,rootWidth=8,width=5,depth=3,widening=1`.

`essais-palier.json`, tag `palier-2026-10-28` : 52 mesures, 78 jobs une fois coupés. Les premiers jobs ont démarré à 22 h 13, les derniers ont
fini à 23 h 54, sans échec, sur le code de `240879f`. Les sorties :
`~/.mcts-backlog/runs/*_cuis-*-palier[B-E]-palier-2026-10-28.txt` ; le tableau ci-dessous en est tiré par un script
de lecture (dans le dossier de travail de la session, pas dans le dépôt).

## Les plats à temps, par paires (variante − A, IC 95 %)

| Réglage | commandes | A à temps (meilleure règle) | B : 256 | C : 8 à la racine | D : profondeur 3 | E : tout |
|---|---|---|---|---|---|---|
| petite, carte | 19,9 | 18,8 (18,3) | +0,07 (−0,09 à 0,23) | +0,00 (−0,13 à 0,13) | +0,03 (−0,11 à 0,18) | +0,07 (−0,12 à 0,25) |
| couloir, carte | 13,3 | 9,1 (8,8) | +0,07 (−0,06 à 0,20) | 0 | +0,07 (−0,16 à 0,30) | +0,13 (−0,05 à 0,31) |
| grande brigade, carte | 34,3 | 29,0 (25,7) | −0,27 (−0,71 à 0,17) | +0,37 (−0,04 à 0,77) | −0,10 (−0,40 à 0,20) | **+0,57 (0,10 à 1,03)** |
| passe-plats, carte | 15,3 | 13,8 (13,1) | −0,03 (−0,10 à 0,03) | 0 | −0,10 (−0,27 à 0,07) | −0,03 (−0,15 à 0,08) |
| postes, carte | 19,9 | 17,3 (16,4) | +0,03 (−0,26 à 0,32) | +0,03 (−0,08 à 0,15) | +0,23 (−0,10 à 0,57) | **+0,40 (0,05 à 0,75)** |
| coupée en deux, carte | 19,9 | 16,3 (14,7) | −0,07 (−0,39 à 0,26) | +0,03 (−0,03 à 0,10) | −0,13 (−0,44 à 0,17) | −0,03 (−0,31 à 0,24) |
| grand détour, carte | 19,9 | 17,2 (15,7) | +0,00 (−0,25 à 0,25) | +0,20 (−0,02 à 0,42) | +0,30 (−0,03 à 0,63) | **+0,37 (0,02 à 0,71)** |
| dark kitchen, carte | 19,9 | 12,9 (12,1) | +0,27 (−0,17 à 0,71) | +0,03 (−0,19 à 0,25) | +0,10 (−0,44 à 0,64) | +0,27 (−0,32 à 0,85) |
| brigade avec plonge, carte | 34,3 | 27,8 (24,6) | +0,03 (−0,27 à 0,34) | −0,17 (−0,66 à 0,33) | −0,13 (−0,55 à 0,28) | **+0,40 (0,03 à 0,77)** |
| grande brigade, tables | 36,0 | 12,3 (6,7) | **+2,70 (0,81 à 4,59)** | +0,30 (−0,28 à 0,88) | −1,33 (−3,29 à 0,63) | **+3,03 (0,97 à 5,10)** |
| grand détour, tables | 20,7 | 11,7 (7,8) | −0,30 (−1,68 à 1,08) | +0,20 (−0,13 à 0,53) | −0,27 (−1,99 à 1,46) | −0,63 (−1,99 à 0,73) |
| petite, banquet | 11,9 | 11,1 (6,5) | +0,00 (−0,47 à 0,47) | 0 | +0,17 (−0,16 à 0,49) | +0,17 (−0,16 à 0,49) |
| grande brigade, banquet | 11,9 | 10,0 (5,6) | −0,23 (−1,16 à 0,69) | +0,57 (−0,28 à 1,41) | +0,50 (−0,22 à 1,22) | +0,97 (−0,21 à 2,15) |

En gras, les intervalles qui ne contiennent pas zéro. « 0 » : les mêmes plats à temps et en retard dans chaque service (la racine y a
sans doute rarement plus de 4 coups). Aucun intervalle n'est entièrement négatif.

## Le temps par décision, et le diagnose

| Réglage | A | B | C | D | E |
|---|---|---|---|---|---|
| petite, carte | 91 ms | 340 | 95 | 182 | 355 |
| grande brigade, carte | 180 ms | 502 | 182 | 340 | 543 |
| brigade avec plonge, carte | 166 ms | 601 | 171 | 319 | 513 |
| grande brigade, tables | 205 ms | 788 | 223 | 406 | 835 |
| grande brigade, banquet | 274 ms | 1 033 | 273 | 537 | 1 015 |

Partout : B et E coûtent 3,5 à 4 fois le temps de A, D 1,8 à 2,7 fois, C rien.

Le diagnose, de A à E : les décisions arrêtées tôt montent un peu (45–92 % pour A, 50–97 % pour E) ; `closeCall`
bouge peu (de 41–86 % pour A à 45–81 % pour E), et la part tranchée par l'arrêt anticipé suit ; `shallow` ne monte
qu'avec la profondeur 3 dans les cuisines étroites (couloir 9 → 16–17 %, coupée en deux 4 → 8 %). **Le coup joué
est moins souvent le premier de la liste courte avec E** (rang 1 : 49–83 % contre 50–87 % pour A, jusqu'à −21 points
au banquet de la grande brigade) : la variante joue davantage les coups que les règles placent plus bas.

## Ce qu'on en lit

- **E gagne un peu** : 5 réglages sur 13 sont significatifs, tous
  positifs ; 10 estimations sur 13 sont au-dessus de zéro. À la carte, c'est +0,4 à +0,6 plat (1,5 à 2,5 % des plats à temps),
  pour 3,7 fois le temps. Avec 52 intervalles à 95 %, on attend 2 à 3 faux positifs : le gain est probable, sa
  taille reste incertaine.
- **B ne gagne qu'aux tables de la grande brigade** (+2,7), comme 128 itérations l'après-midi (+2,2, les mêmes
  services). C'est là que `fewIterations` est le plus haut (21 %). Ailleurs, 256 itérations ne changent rien.
- **C ne change rien**, et ne coûte rien. Dans trois réglages, elle donne les mêmes services. Ailleurs, le coup
  joué change parfois, sans effet sur les plats. Urgences voyait les nouveaux coups joués dans 30 à 40 % des
  recherches ; chez cuisine, ils ne paient pas seuls.
- **D (la profondeur 3 à 128 itérations) ne gagne rien seule**, et perd peut-être aux tables (−1,3 dans la grande
  brigade, l'intervalle contenant zéro). Les 128 itérations y sont trop peu pour trois niveaux. C'est l'inverse
  d'Hypersonic chez codingame, où la profondeur payait.
- **E n'est pas B** : à la carte, B ne gagne rien là où E gagne. Ce qui paie, c'est donc l'ensemble, profondeur et
  largeur avec le budget pour les remplir, et aucun réglage seul.
- **L'essai d'un service à la main (B et E −11 aux tables de la grande brigade) disait l'inverse** de ces 30 services
  (+2,7, +3,0) : un service ne dit rien.
- **Les tables qui meurent** (`docs/recherche/oublis.md`) : aux tables de la grande brigade, 11,7 plats par service
  meurent au passe avec A (17,2 avec la règle de la table), 9,5 avec E ; au grand détour, 1,7. Le point faible pèse
  surtout là, et c'est aussi là que le budget paie.

## À décider (Sami)

- **Rester à A** (64 itérations, le défaut d'aujourd'hui), **ou passer à E** dans les grandes cuisines : +0,4 à
  +0,6 plat à la carte, +3 aux tables, pour 3,7 fois le temps (0,5 à 1 s par décision dans la grande brigade).
  Avant d'en faire un défaut, une confirmation sur d'autres services (d'autres graines) serait la règle de lopin.
- **C et D : abandonnés** comme réglages seuls.
- **La table dont les plats meurent** : la corriger dans le modèle (ne pas envoyer au passe le plat d'une table qui
  ne pourra pas être complète avant qu'il meure) changerait les empreintes, et sans doute ce que le budget gagne
  aux tables.
