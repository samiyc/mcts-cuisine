# Le modèle de la cuisine, première version (22/10/2026)

Un service joué tour par tour : des commandes qui arrivent, des recettes en étapes, des postes qu'on ne
partage pas, des robots et un cuisinier humain simulé ; depuis le soir du 22/10, les robots choisissent
leurs commandes par la recherche (plus bas).

## Ce qui se passe

- **La cuisine** est un texte (`src/kitchens.js`) : `.` le sol, `R` un robot, `H` le cuisinier, `#` un
  comptoir, `o` et `t` les caisses d'oignons et de tomates, `C` une planche, `P` un fourneau, `S` le passe.
  Trois cuisines pour commencer : une petite (2 robots), une en couloir (1 robot, deux passages étroits), une
  grande brigade (4 robots). La page permet d'en dessiner une autre.
- **Les recettes** : la soupe à l'oignon (prendre, couper 3 tours, cuire 8, servir) et la salade de tomates
  (prendre, couper 4, servir).
- **Les commandes** arrivent pendant le service (une tous les 9 tours en moyenne dans la petite cuisine),
  chacune avec sa patience : servie après, elle est en retard ; pas servie à la fin, elle est manquée.
- **Un cuisinier libre** prend une commande et la fait de bout en bout. Une planche ou un fourneau ne sert
  qu'à un cuisinier à la fois : on le réserve avant d'y aller, on attend quand tous sont pris.
- **Les chemins** sont réservés dans l'espace et le temps, comme à l'entrepôt (`grid` de `mcts-commun`) :
  jamais deux cuisiniers dans la même case, jamais de croisement, et l'on ne se gare que là où personne ne
  doit passer ensuite. Un cuisinier qui attend ne reste pas devant un poste, et un cuisinier bloqué deux
  tours de suite se pousse : sans cela, la cuisine en couloir se figeait (un robot au fond de l'impasse du
  passe, le cuisinier qui attendait juste devant).
- **Le cuisinier humain** est simulé, de trois façons : il prend le plat le plus proche, le plus urgent, ou
  au hasard. Les robots voient la commande qu'il a prise une fois qu'il l'a prise.

## Premiers résultats (`npm run compare`, 60 services par cuisine et par humain)

Plats servis à temps, en moyenne par service :

| Cuisine | commandes | robots : la plus ancienne | robots : le plat le plus rapide | sans humain (le plus rapide) |
|---|---|---|---|---|
| petite | 19,5 | 12,3 à 12,4 | 13,3 à 14,0 | 10,2 |
| en couloir | 13,0 | 6,0 à 7,1 | 7,0 à 7,9 | 4,5 |
| grande brigade | 33,9 | 11,3 à 11,8 | 17,2 à 18,6 | 16,0 |

- **Le plat le plus rapide d'abord** bat la commande la plus ancienne partout, avec chaque humain : la règle
  de Smith encore, comme dans l'ordonnanceur de Lopin.
- **L'humain compte** : dans la petite cuisine, sans lui, les robots servent 10 plats à temps au lieu de 13
  à 14. La façon dont il choisit change peu les résultats des robots aujourd'hui, parce qu'ils ne le
  devinent pas encore : ils voient seulement ce qu'il a déjà pris.

## La recherche (22/10, `src/search.js`)

**Comment elle joue.** Chaque fois qu'un robot libre a au moins deux commandes possibles, `search` de
`mcts-commun` joue des services compatibles avec ce que savent les robots :
- les **commandes à venir** sont retirées au sort, au rythme habituel du service ;
- le **cuisinier** est l'un des trois humains simulés, tiré au sort à chaque monde : les robots ne
  connaissent pas ses habitudes. Ses propres tirages (et ceux des robots qui se poussent) le sont aussi.

Elle choisit parmi 4 commandes : le plat le plus rapide, la commande la plus ancienne, l'ingrédient le plus
proche, puis les autres. L'arbre va deux choix plus loin (ce robot, puis le suivant qui se libère), puis le
plat le plus rapide joue pendant 60 tours. Un monde est noté sur les plats servis à temps (un plat encore
dans les temps à l'horizon compte pour moitié), comparés à ceux du plat le plus rapide depuis le même
point. 64 itérations par choix, sur des mondes communs.

**Ce qu'elle donne** (`scripts/search-bench.js`, 30 services par cuisine, le cuisinier « le plus urgent »,
les mêmes services pour toutes les règles). Plats servis à temps par service, et gain sur le plat le plus
rapide, la meilleure règle :

| Cuisine | commandes | la plus ancienne | le plat le plus rapide | recherche | gain (IC 95 %) | services gagnés / nuls / perdus |
|---|---|---|---|---|---|---|
| petite | 19,9 | 11,3 | 12,7 | **13,6** | **+0,87 (+0,40 à +1,33)** | 16 / 13 / 1 |
| en couloir | 13,3 | 5,4 | 6,3 | **7,0** | **+0,73 (+0,32 à +1,14)** | 17 / 9 / 4 |
| grande brigade | 34,3 | 10,3 | 16,4 | **17,5** | **+1,10 (+0,04 à +2,16)** | 17 / 7 / 6 |

- **La recherche bat la meilleure règle dans les trois cuisines**, d'un plat à temps environ par service
  (+7 à +12 %), et laisse moins de plats en retard (2,2 par service dans la petite cuisine, contre 4,1
  pour la plus ancienne).
- Ses réglages par défaut tiennent : explorer moins (0,15) ne fait pas mieux ; un horizon de 90 tours ou un
  budget de 128 gagnent un dixième de plat, dans l'intervalle.
- Un service prend 1 à 6 s de recherche.

**Ce que vaut de connaître le cuisinier.** Une recherche à qui l'on donne les vraies habitudes du
cuisinier (une mesure, jamais ce que savent les robots) :

| Cuisine, cuisinier | recherche (cuisinier tiré au sort) | recherche (cuisinier connu) |
|---|---|---|
| petite, le plus urgent | +0,87 (+0,40 à +1,33) | +1,13 (+0,69 à +1,58) |
| petite, le plus proche | +0,90 (+0,16 à +1,64) | +1,20 (+0,53 à +1,87) |
| grande brigade, le plus urgent | +1,10 (+0,04 à +2,16) | +0,73 (−0,47 à +1,94) |

**Le connaître rapporte peu ici** : 0,3 plat dans la petite cuisine, rien dans la brigade, chaque fois dans
les intervalles. C'est la cuisine qui le veut : le cuisinier prend une commande à la fois, et les robots
voient ce qu'il a pris dès qu'il l'a pris. Ses habitudes ne pèsent que sur la commande suivante. Pour que
le deviner compte, il faut qu'il gêne davantage les robots : des postes partagés plus rares, des recettes
plus longues où l'on se passe des ingrédients, ou un vrai joueur dans la page, bien moins prévisible que
trois règles.

## La suite

1. **Jouer le cuisinier** dans la page, au clavier, avec les robots.
2. **Des recettes plus longues** (plusieurs ingrédients), et poser un ingrédient sur le comptoir pour qu'un
   autre le reprenne.
