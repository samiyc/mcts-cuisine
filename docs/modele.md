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
| coupe, cuisson | 12,2 | 9,8 |
| cuisson, coupe | 12,1 | — |
| coupe, sans rôle | 12,8 | — |
| sans rôle, cuisson / salade, cuisson | 14,7 | — |

Sans humain : 11,0 sans rôles, 5,4 avec coupe et cuisson.

Ces chiffres ont été corrigés le soir du 23/10. Le robot qui coupe, venu aider à cuire, reprenait un lot sur un
comptoir puis le reposait aussitôt, une quarantaine de fois par service. La première mesure (10,8 et 9,0)
comptait cette boucle.

- **Ici, les rôles coûtent 2 à 3 plats**, et tout vient du robot qui coupe. La cuisson est l'étape la plus
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

## La cuisson sans surveillance, la soupe qui brûle (23/10, Sami, le soir)

Sami : la soupe cuit seule, mais si personne ne vient la chercher à temps, elle brûle. Le plat est perdu, et il
faut nettoyer le fourneau avant d'y recuire (une pénalité de temps). C'est plus simple, pour commencer, que
toute la vaisselle sale avec l'évier. Une option par cuisine (`unattended: { burn, clean }`) ; dans la page,
« La soupe cuit seule », avec ses deux délais (6 et 5 tours par défaut). Les cuisines livrées ne l'ont pas : leurs
chiffres ne bougent pas.

**Ce qui est modélisé.**
- **Poser la marmite** prend un tour au fourneau, et le cuisinier repart. La soupe cuit seule ses 8 tours et
  garde le fourneau. Prête, elle attend qu'un cuisinier vienne la **retirer** (un tour), puis la serve.
- **Une soupe prête** est proposée à tous, quel que soit le rôle. Pour la règle « le plat le plus rapide », elle
  passe avant tout, puisqu'il ne reste rien à faire.
- **Laissée `burn` tours après être prête, elle brûle.** Le plat est perdu et la commande redevient ouverte :
  il faut tout refaire, contre la même échéance. Le fourneau est à nettoyer : le prochain qui y cuit passe
  `clean` tours de plus. Un fourneau propre un peu plus loin est préféré.
- **Les habitudes d'un cuisinier qui surveille.**
  - Tant que sa marmite cuit, il ne prend qu'une soupe à retirer ou une commande qu'il aura coupée avant.
    Sinon il attend devant son fourneau, et non chez lui : il fallait 5 tours pour revenir retirer la soupe,
    contre 2,5 maintenant.
  - Le robot « cuisson » surveille tous les fourneaux : tant qu'une marmite est sur le feu, il n'aide nulle part
    ailleurs.
  - Des oignons coupés ne sont pas repris quand chaque fourneau porte une marmite. Un cuisinier qui attend un
    fourneau, des oignons en main, quand une soupe est prête, les pose sur un comptoir libre pour aller la
    retirer.
  - Sans ces habitudes, 4 à 7 soupes brûlaient par service, tous les cuisiniers étant partis sur une autre
    commande.

**Ce que ça donne** (60 services, le cuisinier « le plus urgent », le plat le plus rapide ; plats servis à temps) :

| Cuisine, rôles | soupe surveillée | cuit seule (brûle à 6, nettoyage 5) | soupes brûlées |
|---|---|---|---|
| Postes, sans rôles | **14,7** | 13,1 | 0,6 |
| Postes, coupe et cuisson | 12,2 | 9,0 | 1,1 |
| Postes, sans rôle et cuisson | 14,7 | 12,3 | 1,0 |
| Passe-plats, sans rôles | **11,9** | 9,4 | 2,7 |

La recherche fait mieux que la règle, mais l'écart reste (Postes, 12 services) : sans rôles, 15,8 surveillée
et 14,6 seule ; avec coupe et cuisson, 13,6 et 11,0.

- **La cuisson seule ne gagne pas ici**, même sans brûlure : avec une soupe qui ne brûle jamais, on sert 13,5
  plats à temps contre 14,7 en la surveillant.
  - Chaque soupe coûte deux gestes de plus (poser, retirer).
  - Le cuisinier libéré part sur une autre commande, et la soupe prête l'attend.
  - La cuisine n'est pas saturée : une commande tous les 9 tours, et presque toutes sont servies. Ce qui compte
    est la vitesse de chaque plat, pas le débit des fourneaux.
- **Plus de demande ne change pas le verdict** : une commande tous les 6 tours, 14,8 surveillée contre 13,9
  seule ; tous les 4 tours, 12,2 contre 11,4.
- **Les rôles perdent encore plus.** Le robot « cuisson » attend devant ses fourneaux pendant que les salades
  s'empilent : personne n'a le rôle « salade ».
- **Ce que ça dit des robots.** Ils choisissent une commande, mais pas quand revenir au feu : c'est une
  habitude écrite, et elle est grossière. Décider « je finis ma coupe ou je retire la soupe » est une décision
  de plus, que la recherche pourrait prendre.

## Les comptoirs en relais, l'avance, le fourneau à récurer (23/10, Sami, tard le soir)

Sami, en jouant :
- on ne peut pas récurer le fourneau brûlé ;
- on ne peut pas prendre d'oignons ou de tomates sans commande, pour prendre de l'avance ;
- dans une cuisine coupée en deux, les robots sont perdus et n'utilisent pas les comptoirs pour se passer les
  plats.

Il proposait un échange de messages entre cuisiniers : « il me faut un fourneau », « ok, je suis libre, j'ai
accès au gaz ». Les comptoirs jouent ce rôle : un plat posé dessus est une demande, que tout le monde voit.

**Ce qui est modélisé.**
- **Le tableau des comptoirs.** Tout ce qu'on tient une fois coupé peut attendre sur un comptoir, avec ce qu'il
  lui faut encore :
  - des oignons coupés : « il faut un fourneau » ;
  - une salade coupée ou une soupe cuite : « il faut le passe ».
  - Le cuisinier qui vient le chercher répond « je prends ». La page le montre sous les commandes.
- **Chacun ne se voit proposer que ce qu'il peut atteindre** : la caisse de la commande, ou le comptoir du plat,
  et alors aussi le fourneau ou le passe qu'il lui faut. Un robot ne reprend jamais un plat qu'il vient de poser
  pour un autre : la première version le reposait et le reprenait aussitôt.
- **Un relais forcé** : quand le poste suivant est hors de portée, le cuisinier pose son plat sur un comptoir libre
  qu'un robot de l'autre côté atteint.
- **Un relais choisi**, pour un robot : poser pour un robot libre, quand celui-ci finira plus tôt que lui (la pose,
  l'attente, la reprise comptées), et que le premier s'épargne de la marche. `relay: false` ne garde que les relais
  forcés, pour mesurer.
- **Le rôle « passe »** : il ne sert que ce qui est prêt (sur un comptoir ou sur le feu). Il attend près du passe tant
  qu'un plat est en route. Les autres lui confient tout plat à servir qu'il apportera plus tôt, même s'il est
  occupé.
- **L'avance**, pour le chef au clavier : prendre un ingrédient sans commande ouverte, le couper, le cuire, le poser.
  La prochaine commande de ce plat reprend ce lot là où il est : dans ses mains, sur un comptoir, sur le feu. On ne
  sert pas un lot sans commande.
- **E devant un fourneau brûlé**, les mains vides : le chef le récure (5 tours par défaut).
- Dans la page, la vitesse est réglée par défaut à 4 tours par seconde.

**Ce que ça donne** (60 services, le plus rapide ; le cuisinier « le plus urgent », puis sans humain) :

| Cuisine | sans relais choisis | avec | relais par service |
|---|---|---|---|
| Coupée en deux (Sami), sans rôles | 12,1 / 8,4 | 12,1 / 8,4 | 8,7 / 5,7, tous forcés |
| Le grand détour (Sami), sans rôles | 5,7 / 4,1 | 5,7 / 4,0 | 0,3 |
| Le grand détour, robot 2 au passe | 4,0 / 3,4 | **7,6 / 6,4** | 8,8 / 9,5 |
| Postes (5 comptoirs), sans rôles | 14,8 / 10,9 | 14,6 / 10,9 | 0,3 |
| Passe-plats, sans rôles | 11,9 / 8,6 | 11,8 / 8,5 | 1,5 |

- **Coupée en deux**, la cuisine servait **0** plat : chacun prenait une commande dont la caisse ou le fourneau
  était de l'autre côté. Avec les relais forcés, elle en sert 12.
- **Le grand détour** : un robot au passe, que les autres fournissent par les comptoirs, fait **+1,9 plat**
  (+2,4 sans humain). Sans les relais, ce rôle coûte au contraire 1,8 plat : un robot de moins aux fourneaux,
  qui fait le chemin lui-même.
- **Ailleurs, les relais choisis ne changent rien** (±0,1 plat) : ils se déclenchent rarement, faute de robot
  libre. Ils ne paient que si la cuisine les rend nécessaires, par la forme du plan ou par un rôle.
- Dans la cuisine coupée en deux, un robot au passe fait moins bien (10,2) : le passe touche déjà le fourneau.

**Céder sa place, et le cuisinier qui relaie aussi** (Sami, le même soir, sur le grand détour). Le cuisinier
réservait l'unique case devant le passe depuis l'autre bout de la cuisine. Le robot 2, juste à côté, ne pouvait
pas y servir sa salade. Et le cuisinier simulé ne posait jamais rien pour un autre ; seuls les robots le faisaient.
- **Céder sa place** : un cuisinier trouve tous les postes de son geste pris par des cuisiniers encore en route. Si
  l'un d'eux n'arriverait qu'après qu'il a fini et libéré le poste, celui-là lui laisse la place, s'arrête et regarde
  de nouveau au tour suivant, en attendant près du poste.
- **Le cuisinier relaie** comme les robots, quand un robot libre (ou celui du passe) finira son plat plus tôt.
- Le chef au clavier reste libre de ses gestes : il pose lui-même, et on ne lui reprend jamais sa place.

Ce que ça donne (60 services, le plus rapide ; plats à temps avec le cuisinier « le plus urgent », « le plus proche »,
puis sans humain) :

| Cuisine | avant | après |
|---|---|---|
| Le grand détour | 7,6 / 9,0 / 6,4 | **10,2 / 11,6** / 6,4 |
| Petite cuisine | 13,8 / 14,1 / 10,3 | 14,2 / 14,4 / 10,4 |
| Postes | 12,2 / 12,6 / 5,4 | 12,3 / 13,0 / 5,5 |
| Passe-plats | 9,8 / 9,9 / 4,5 | 9,9 / 10,2 / 4,5 |
| Grande brigade | 17,7 / 19,2 / 16,2 | 17,7 / 19,3 / 16,2 |
| en couloir, coupée en deux | — | inchangées |

- **Sur le grand détour, c'est le relais du cuisinier** : 7,5 par service, et +2,6 plats à lui seul. Céder sa place
  joue peu ici (0,1 fois par service).
- **Ailleurs, c'est céder sa place** : 1,2 fois par service dans la petite cuisine (+0,3 plat), 0,7 dans « Postes ».
  Rien ne baisse.


## Les réglages de Sami par défaut, et la soupe du chef (23/10, tard le soir)

Sami joue avec la recherche, le cuisinier « au hasard » (les robots comblent ses manques) et la cuisson sans surveillance, qui donne plus de variété : c'est maintenant ce que la page propose au départ, et **la cuisson sans surveillance est active dans toutes les cuisines** (`UNATTENDED` de `kitchens.js` : brûle 6 tours après être prête, 5 tours de nettoyage ; `unattended: null` pour la soupe surveillée).

**La soupe du chef au clavier** (bug de Sami) : sa soupe prête, un robot partait la chercher, et le temps qu'il arrive elle avait brûlé ; le chef, lui, ne pouvait plus la prendre (« un robot vient déjà la chercher »).
- Un robot ne prend une soupe prête que s'il arrive avant qu'elle brûle.
- La soupe du chef au clavier lui est laissée, sauf au dernier moment (le robot y arriverait de justesse).
- Le chef devant son fourneau la reprend toujours, même si un robot y allait : le robot retourne à autre chose.

Ce que coûte la cuisson sans surveillance partout (60 services, le plus rapide ; le cuisinier « le plus urgent » / « le plus proche » / sans humain) : petite 14,2 → 13,0, en couloir 6,3 → 5,7, brigade 17,7 → 16,8, passe-plats 9,9 → 7,5, postes 12,3 → 9,3, coupée en deux 12,1 → 11,3, le grand détour 10,2 → 8,6 (cuisinier le plus urgent). Comme mesuré plus haut, la soupe seule ne gagne pas de plats ici ; elle donne des soupes brûlées, des fourneaux à nettoyer, et des décisions de plus.


**Les replays du chef au clavier** (Sami, 23/10, pour déboguer ce qu'il voit dans le grand détour). Un service se rejoue à l'identique depuis sa cuisine, son numéro, la règle des robots et les touches pressées avec leur tour (`src/replay.js`, format `cuisine-replay/1`). Dans la page, « Replays du chef au clavier » : les 20 derniers services joués au clavier sont gardés dans le navigateur, se téléchargent ou se rejouent (les touches viennent alors du replay). `npm run replay -- fichier.json [--trace]` rejoue un fichier sous Node et dit ce qui semble anormal, avec le tour : un cuisinier qui « travaille » encore après la fin de son geste, ou loin du poste où il travaille, un poste pris par quelqu'un qui n'y travaille pas. 60 services joués au hasard au clavier (et 6 avec la recherche) n'en montrent aucun ; les blocages que Sami a vus ont été trouvés plus tard avec ses replays (« Le chef au clavier, les bugs de la nuit »).


**Les écarts du chef** (l'étape 2 de la feuille de route : les replays avec un humain, pour analyser les écarts). À chaque commande que le chef a prise, chaque commande qu'il aurait pu prendre est rejouée avec le recul : depuis l'état juste avant, le chef la prend, puis continue en humain simulé « le plus urgent », les robots sous « le plat le plus rapide » (pour la vitesse), les vraies commandes du service à venir, pendant 60 tours ; un choix vaut les plats servis à temps à la fin, ceux encore dans les temps comptés à moitié. Son propre choix est rejoué de la même façon, pour que l'écart ne soit que celui du choix (`gapsOf`, `src/replay.js`). Dans la page, « Analyser les écarts » sur un replay gardé ; `npm run replay -- fichier.json --gaps` sous Node. C'est une analyse avec le recul : elle dit où un choix a coûté, pas ce qu'on pouvait deviner sur le moment.


## Le chef au clavier, les bugs de la nuit (23/10, tard, avec les replays de Sami)

Chaque bug a été retrouvé dans un replay de Sami, puis corrigé et vérifié par un test.
- **Un robot qui travaillait en marchant** (`25afdab`) : le chemin d'un robot pouvait passer sur sa case, s'écarter pour laisser passer quelqu'un, puis revenir ; il se mettait à travailler au premier passage et continuait de marcher. Il ne travaille plus qu'au bout de son chemin. Les plats servis à temps bougent de ±0,2 par service.
- **« Le chef travaille » qui restait affiché** (`a91a76d`) : la coupe d'un oignon dure 3 tours, mais le message restait après la fin du geste et ressemblait à un gel. Le chef occupé dit maintenant ce qu'il fait et combien de tours il reste (« le chef coupe : encore 2 tours »), et chaque touche remplace la réponse d'avant.
- **Deux tours perdus avant de prendre la soupe** (`57e2c81`) : la touche du chef passait avant le début du tour. Au tour où la soupe devenait prête, E répondait « la soupe cuit encore », et le tour où un geste finissait, la touche était encore refusée. Le tour commence maintenant avant la touche : la soupe se prend le tour même où elle est prête, et le chef est libre dès la fin de son geste. Les replays passent en `cuisine-replay/2` ; ceux de la version 1 se rejouent comme ils ont été joués.
- **La fin du service** (`5dac2d9`) : après le tour 200, une touche ne faisait rien en silence ; elle dit maintenant que le service est fini.
- **Le chiffre sur la marmite** (`cffa877`) : sur 🥘, les tours avant que la soupe soit prête ; sur 🍲, les tours avant qu'elle brûle (6 dans le grand détour). La légende et le survol le disent. Le chiffre affiché après une touche est celui du tour suivant : une soupe prise à 6 se voit à 5.
- **Le robot qui attendait le chef pour toujours** (`a1bb6df`) : le chef s'était posé sur la case devant la planche du haut, que le robot 1 avait réservée ; le robot l'a attendu 111 tours, et le E du chef devant la planche répondait « une planche est occupé ». Un robot arrêté avant son poste le libère et cherche de nouveau (l'autre planche, ou il attend). Le replay de Sami est devenu un test (`tests/fixtures/chef-on-the-robots-cell.json`), et le jeu au hasard au clavier cherche aussi un robot immobile en route : sur l'ancien code il le trouve au premier service, sur le nouveau, rien sur 300 services.
- **Le replay du service en cours** (`25afdab`) : gardé tous les 20 tours, à la pause et à « Recommencer », sous une seule date (chaque sauvegarde remplace la précédente), et plus seulement à la fin : un service qui se fige laisse son replay.

**Les replays rangés seuls** (Sami, 23/10 au soir) : chaque partie gardée par la page est aussi envoyée au serveur de la page (`POST /api/replays` de mcts-commun), qui l'écrit dans `replays/`, hors de git (comme `replays/` dans Lopin). Un serveur lancé avant cette version répond 404 : il faut relancer `npm run page`.

**L'allure** (Sami, 23/10, tard) : la page prend l'allure commune des projets (`mcts-commun/web/theme.css`, dans l'esprit de Lopin) : un bandeau dans la couleur de l'application, les réglages en carte, les sections pliables bien visibles (une barre, un chevron qui tourne, « Ouvrir / Fermer »), les tableaux et le thème sombre. Ici, une cuisine orange, aux teintes chaudes, et 🍳 devant le titre.

## Les premières mesures de nuit (23/10 au soir, mcts-backlog)

50 services par cuisine, avec chaque humain simulé et sans humain, la cuisson sans surveillance ; plats servis à temps, le cuisinier « au hasard » (la plus ancienne / le plat le plus rapide / la recherche) : petite 9,5 / 11,7 / **12,8** ; en couloir 4,3 / 5,3 / **5,7** ; grande brigade 8,9 / 16,9 / **17,0** ; passe-plats 6,7 / 7,0 / **7,9** ; postes 8,4 / 8,9 / **10,6** ; coupée en deux 11,1 / 11,0 / **12,7** ; le grand détour 5,8 / 8,9 / **10,1**.
- **La recherche fait au moins aussi bien que la meilleure règle dans toutes les cuisines, avec chaque humain et sans humain.** Son avance est la plus nette sur le grand détour (+2,1 avec le cuisinier « le plus proche ») et dans « Postes » (+1,5 à +2,5).
- **La grande brigade** : la mesure de l'après-midi sur 12 services donnait la recherche derrière (−1,3) ; sur 50, elle est devant avec chaque humain (+0,1 à +1,2) : les 12 services étaient trop peu.
- Chaque job a pris 8 à 39 min sur un fil ; les quinze mesures des trois projets ont tourné côte à côte en 39 min.

## La suite

Les étapes communes aux trois dépôts sont dans la [feuille de route](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/feuille-de-route.md) § 6 (Sami, 23/10 au soir) : l'ordonnanceur en commun pour les mesures de nuit, les replays avec un humain pour analyser les écarts, la vitrine. Le journal des versions est dans la page (`web/changelog.html`).

1. **Les mesures de nuit** — prêtes (23/10) : `night.json` à la racine du dépôt, à ajouter à la file de la machine par `mcts-backlog --add-file` (mcts-commun), puis à lancer par `mcts-backlog` ; : la recherche contre les règles sur des centaines de services, avec chaque humain
   simulé.
2. **Les replays du chef au clavier** — faits le 23/10 (les replays, les anomalies, les écarts de ses choix) ; reste :
   ajuster le modèle de l'humain sur ces parties, et la même analyse pour les gestes (couper, poser, relayer).
3. **Les robots en avance** : qu'un robot libre prépare un lot sans commande, du plat le plus demandé.
4. **Laisser la recherche décider de revenir au feu** : retirer la soupe ou finir ce qu'on fait.
5. **Des recettes plus longues** (plusieurs ingrédients), où l'on se passe les ingrédients d'un comptoir à
   l'autre.
