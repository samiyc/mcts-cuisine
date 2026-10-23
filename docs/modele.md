# Le modèle de la cuisine, première version (22/10/2026)

Un service joué tour par tour : des commandes qui arrivent, des recettes en étapes, des postes qu'on ne
partage pas, des robots et un cuisinier humain simulé ; depuis le soir du 22/10, les robots choisissent
leurs commandes par la recherche (plus bas).

## Ce qui se passe

- **La cuisine** est un texte (`src/kitchens.js`) : `.` le sol, `R` un robot, `H` le cuisinier, `#` un
  mur, `_` un comptoir (depuis le 23/10, plus bas), `o` et `t` les caisses d'oignons et de tomates, `C` une
  planche, `P` un fourneau, `S` le passe. Quatre cuisines : une petite (2 robots), une en couloir (1 robot,
  deux passages étroits), une grande brigade (4 robots) et le passe-plats (2 robots, deux comptoirs). La
  page permet d'en dessiner une autre.
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

## Les comptoirs (23/10, Sami, le matin ; remplacé l'après-midi, voir « Les postes »)

**Ce qui était modélisé.** Un comptoir (`_`) tient un seul plat prêt. Le cuisinier, son plat fini, le pose sur
le comptoir libre le plus proche quand il est plus près que le passe (`handOff` : de combien de pas au
moins), puis retourne cuisiner. Le plat attend, et un robot libre le voit parmi ses choix, à côté des
commandes à cuisiner : il va le reprendre (un tour) et le sert. Les robots servent eux-mêmes leurs plats.
Les cuisines sans `_` jouent exactement comme avant (vérifié sur 120 services) : les murs `#` ne
prennent rien. La cuisine **passe-plats** (11 × 6, deux comptoirs au milieu, une commande tous les 12 tours)
est faite pour l'essayer.

**Ce que ça donne** (40 services, le cuisinier « le plus urgent », plats servis à temps) :

| Passe-plats | les robots : le plat le plus rapide | la recherche (20 services) |
|---|---|---|
| des murs à la place des comptoirs | 11,4 | — |
| avec les comptoirs | 10,5 | **11,8** (+1,25 sur la règle, +0,63 à +1,87 ; 12 gagnés, 0 perdu) |

- **Avec les règles, les comptoirs coûtent un peu** (0,6 à 0,9 plat, quel que soit le seuil `handOff`) :
  poser puis reprendre coûte deux tours et un trajet de robot, et ce robot ne cuisine pas pendant ce temps.
  Ici les robots cuisinent aussi bien que le cuisinier ; un relais ne paie que si quelqu'un est plus
  lent à quelque chose.
- **La recherche, elle, en tire parti** : elle choisit quand reprendre un plat posé et quand cuisiner, et
  sert plus de plats à temps qu'avec des murs.
- C'est la mécanique qu'il fallait pour **jouer le chef** : poser un plat et voir si un robot vient le
  chercher.

**La page** : des vitesses lentes (jusqu'à 2 s par tour) pour suivre les commandes ; chaque commande avec
l'emoji et la couleur de son plat (🍲 soupe, 🥗 salade), son âge et une **barre de patience** (pleine à la
commande, vide à l'échéance, verte puis orange puis rouge) ; les plats posés sur les comptoirs ; le
fourneau devient 🔥.

## Les postes : des rôles, et les comptoirs pour les oignons coupés (23/10, Sami, l'après-midi)

Sami, en regardant la page : un cuisinier qui pose une soupe finie sur un comptoir n'a pas de sens ; un
comptoir sert plutôt à garder **des oignons coupés en attente de cuisson**. Et les robots ont **un rôle** :
l'un coupe, l'autre cuit, un troisième fait les salades. Quand la demande est forte et que quelqu'un est
libre, il donne un coup de main. Ce qui est modélisé :
- **Le comptoir** tient un lot d'oignons coupés. Le cuisinier ne pose plus de plat fini : la section
  précédente ne vaut plus (`handOff` est retiré), et ses chiffres non plus.
- **Les rôles** (`roles` d'une cuisine, un par robot, dans l'ordre du plan ; dans la page, « Rôles des
  robots ») :
  - `coupe` : prend l'oignon, le coupe, puis le pose sur un comptoir libre. Sans comptoir libre, il le cuit
    lui-même.
  - `cuisson` : reprend des oignons coupés sur un comptoir, les cuit et sert la soupe.
  - `salade` : fait les salades.
  - Un robot sans rôle, et le cuisinier, font des plats entiers, comme avant.
- **Le coup de main** : un robot se voit proposer d'abord le travail de son rôle. Il aide à autre chose
  quand il n'en a pas, ou à la cuisson dès que deux lots ou plus attendent sur les comptoirs.
- **La cuisine « Postes »**, celle de Sami (11 × 5) : trois comptoirs entre les planches et les fourneaux,
  un robot qui coupe, un qui cuit.

**Ce que ça donne** (60 services, le cuisinier « le plus urgent », plats servis à temps) :

| Rôles des deux robots | Postes | Passe-plats |
|---|---|---|
| aucun (chacun fait des plats entiers) | **14,7** | **11,9** |
| coupe, cuisson | 10,8 | 9,0 |
| cuisson, coupe | 11,4 | — |
| coupe, sans rôle | 11,0 | — |
| sans rôle, cuisson / salade, cuisson | 14,7 | — |

Sans humain, l'écart est le même : 11,0 sans rôles, 4,5 avec coupe et cuisson.

- **Ici, les rôles coûtent 3 à 4 plats**, et tout vient du robot qui coupe. La cuisson est l'étape la plus
  longue (8 tours, contre 3 pour couper), mais un seul robot la fait, alors qu'il y a deux fourneaux. Entre
  les deux, chaque lot coûte deux gestes de plus (poser, reprendre) et un trajet.
- **Un rôle de cuisson, seul, ne coûte rien** : sans soupe coupée à cuire, ce robot aide à tout le reste.
- **Pourquoi ce n'est pas le cas en vrai.** Dans le modèle, tous les robots savent tout faire aussi vite, et
  un cuisinier reste planté devant son fourneau pendant la cuisson. En cuisine, la soupe cuit seule : un
  robot de cuisson surveillerait les deux fourneaux à la fois, et la spécialisation paierait. C'est le
  prochain réglage à essayer (**la cuisson sans surveillance** : poser la marmite, repartir, revenir la
  chercher). Ensuite, des robots plus rapides à leur poste.

**L'attente près du poste** (Sami : un robot ou le chef, une soupe prête dans les mains, retournait à sa place
avant d'aller au passe). Un cuisinier qui a quelque chose en main et dont le poste est pris attend maintenant
sur la case libre la plus proche de ce poste, hors des cases de travail. S'il y bloque quelqu'un plus de trois
tours (un couloir étroit), il s'écarte comme avant. Effet : +0,5 plat sur la petite cuisine et sur la brigade ;
dans la cuisine en couloir, −0,7 (6,3 contre 7,0) : y attendre près d'un poste gêne le passage.

**Jouer le chef au clavier** (Sami, 23/10). Dans la page, « Le cuisinier : c'est vous, au clavier » :
- **Z Q S D** (ou les flèches) le déplacent d'une case par tour ;
- **E** travaille au poste à côté : prendre un ingrédient à sa caisse (le chef prend alors la commande la
  plus urgente de ce plat, et les robots la lui laissent), couper, cuire, poser des oignons coupés sur un
  comptoir ou les reprendre, servir au passe.
- La touche joue au tour suivant pendant que le service tourne ; en pause, elle joue son tour tout de suite.
- **Les robots s'adaptent** : un robot dont le chemin réservé passe par la case où le chef va est replanifié
  autour de lui. Ils ne connaissent pas ses habitudes : la recherche, elle, imagine le chef sous un modèle
  d'humain tiré au hasard. On peut maintenant voir si les robots le gênent.

## La suite

1. **La cuisson sans surveillance**, pour que les rôles aient une chance (plus haut).
2. **Des recettes plus longues** (plusieurs ingrédients), où l'on se passe les ingrédients d'un
   comptoir à l'autre.
