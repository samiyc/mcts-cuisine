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

## Les indicateurs du métier (26/10, étape 0 de la feuille de route des métiers)

Sami : passer aux étapes 0 et 1 de [`recherche/feuille-de-route.md`](recherche/feuille-de-route.md). L'étape 0 compte
sans rien décider (`src/service-measures.js`, [`recherche/indicateurs.md`](recherche/indicateurs.md)) :
- **le bon** : de la commande au passe, en moyenne, au 9e décile (`p90Serve`) et au plus (`maxServe`) ; le retard
  maximal d'un plat servi (`maxLate`) ;
- **le coup de feu** : le plus de bons ouverts au même tour (`peakOpen`), et ce tour (`peakAt`) ;
- **les postes** : la part des tours où le plus chargé de chaque sorte travaille (`useBoard`, `useStove`, `usePass`,
  `useCounter` : un geste, une marmite, un plat posé), et les tours passés à attendre qu'un poste de cette sorte se
  libère (`waitBoard`…) ;
- **le cuisinier** : les plats qu'il a servis (`servedByHuman`).

Les mondes de la recherche ne comptent rien (`tally` à `null` dans `cloneService`) : ils décident, on ne les mesure
pas, et la recherche ne paie pas ce comptage. Les journaux des services sont identiques avant et après ; les quatre
empreintes ont changé parce qu'elles hachent les mesures, et redonnent les anciennes une fois les mesures ramenées aux
anciennes. Les indicateurs passent dans `npm run compare`, l'onglet Stats et la fin d'un service de la page.

**Ce qu'ils disent** (`compareRules`, 50 services par cuisine, le plat le plus rapide, le cuisinier « le plus
urgent », la cuisson sans surveillance) :

| Cuisine | à temps / commandes | bon moyen | bon p90 | bon max | coup de feu | planche | fourneau | passe | comptoir | attente : fourneau | passe |
|---|---|---|---|---|---|---|---|---|---|---|---|
| petite | 12,6 / 19,5 | 46,1 | 75,5 | 92,3 | 8,8 | 22 % | 28 % | 8 % | — | 5,3 | 27,9 |
| en couloir | 5,6 / 13,0 | 63,0 | 103,4 | 107,1 | 7,4 | 17 % | 22 % | 4 % | — | 15,6 | 23,3 |
| grande brigade | 16,7 / 33,7 | 51,0 | 82,5 | 115,2 | 16,9 | 21 % | 27 % | 6 % | — | 2,2 | 28,4 |
| passe-plats | 7,2 / 14,9 | 54,2 | 88,1 | 97,9 | 7,8 | 21 % | 32 % | 5 % | 35 % | 6,1 | 23,0 |
| postes | 9,0 / 19,5 | 53,0 | 84,6 | 95,6 | 9,8 | 21 % | 28 % | 7 % | 34 % | 6,6 | 15,0 |
| coupée en deux | 11,0 / 19,5 | 39,4 | 85,0 | 100,8 | 9,0 | 16 % | 23 % | 7 % | 66 % | 55,8 | 6,5 |
| le grand détour | 8,0 / 19,5 | 57,8 | 89,1 | 104,3 | 10,2 | 21 % | 31 % | 7 % | 30 % | 0,6 | 4,3 |

- **Aucun poste n'est saturé** : la planche et le fourneau les plus chargés travaillent un quart à un tiers du service.
  Ce qui borne la cuisine est **la marche** des cuisiniers, pas les feux.
- **Le passe** attend 15 à 28 tours par service dans cinq cuisines, alors qu'il ne sert que 4 à 8 % du temps : il n'a
  qu'**une case d'accès** dans ces plans (`##S##`), et les cuisiniers y font la queue. Le grand détour et la cuisine
  coupée en deux, où le passe a un robot ou deux côtés, n'attendent presque pas.
- **La cuisine coupée en deux attend ses fourneaux 56 tours pour 23 % d'usage** : un fourneau est réservé par un
  cuisinier encore loin (de l'autre côté des comptoirs), et ne cuit pas pendant ce temps. Un poste réservé n'est pas
  un poste au travail ; ce temps-là n'est pas encore compté à part.
- **Le 9e décile du bon dépasse la patience** (60 à 70 tours) partout : un plat sur dix arrive très en retard ou pas
  du tout. La moyenne (39 à 63) le cachait.

## La suite

Les étapes communes aux trois dépôts sont dans la [feuille de route](https://github.com/samiyc/lopin/blob/main/docs/ismcts-ailleurs/feuille-de-route.md) § 6 (Sami, 23/10 au soir) : l'ordonnanceur en commun pour les mesures de nuit, les replays avec un humain pour analyser les écarts, la vitrine. Le journal des versions est dans la page (`web/changelog.html`).

Les étapes du métier (Sami, 26/10) sont dans [`recherche/feuille-de-route.md`](recherche/feuille-de-route.md) : les indicateurs des restaurants, la brigade (les tables, le passe, la rupture, la mise en place), le traiteur et la livraison, d'après les recherches de [`recherche/`](recherche/README.md).

1. **Les mesures de nuit** — prêtes (23/10) : `night.json` à la racine du dépôt, à ajouter à la file de la machine par `mcts-backlog --add-file` (mcts-commun), puis à lancer par `mcts-backlog` ; : la recherche contre les règles sur des centaines de services, avec chaque humain
   simulé.
2. **Les replays du chef au clavier** — faits le 23/10 (les replays, les anomalies, les écarts de ses choix) ; reste :
   ajuster le modèle de l'humain sur ces parties, et la même analyse pour les gestes (couper, poser, relayer).
3. **Les robots en avance** : qu'un robot libre prépare un lot sans commande, du plat le plus demandé.
4. **Laisser la recherche décider de revenir au feu** : retirer la soupe ou finir ce qu'on fait.
5. **Des recettes plus longues** (plusieurs ingrédients), où l'on se passe les ingrédients d'un comptoir à
   l'autre.

## Les tables, le passe et la rupture (26/10, étape 1 de la feuille de route des métiers)

Les choix de Sami (26/10) : une table est **un groupe de commandes** ; un plat attend sa table **10 tours** au passe,
puis il est perdu et refait ; une caisse vide fait **refuser** les commandes de son plat ; la mise en place est
**reportée** (c'est le chantier des robots en avance, « La suite » 3). Deux réglages, éteints par défaut : les
services sans eux ont les mêmes journaux qu'avant.

**Les tables** (`setup.tables`, `src/service-tables.js`) :
- une table commande 2 ou 3 plats à la fois, chacun une commande avec le numéro de la table et son échéance ; les
  tables arrivent au rythme de la cuisine divisé par leur taille moyenne, pour garder à peu près autant de plats
  (hypothèse) ;
- un plat fini va **au passe** et y attend sa table ; la table part entière, quand son dernier plat arrive ; un plat
  qui attend plus de 10 tours **meurt au passe** et sa commande revient à faire (« à la volée ») ;
- la recherche imagine des tables dans ses mondes et les joue avec la règle de la table ;
- **une règle simple de plus, « la table »** (faire marcher) : la table la plus ancienne, son plat le plus long
  d'abord ; un plat ne part que si ce qui reste aux autres plats de sa table ne dépasse pas son propre travail de plus
  de 4 tours (hypothèse). Sans tables, elle revient à « la plus ancienne ».

**Ce qu'elles donnent** (30 services, le cuisinier « le plus urgent ») : **presque aucune table ne part à temps.**
Petite cuisine, tables de 2 ou 3, passe à 10 tours : 0,5 à 1 table sur 8,3 à temps, 10 à 13 plats morts au passe, 1 à
2 plats à temps au lieu de 12 sans tables. Même avec 40 tours au passe et des tables de deux, au mieux un tiers des
tables part à temps (3,3 sur 11,1), et les plats à temps tombent de 12-16 à 4-8. La règle de la table fait mourir moins
de plats (souvent deux fois moins) mais ne sert pas plus de tables à temps, sauf dans le grand détour (+0,8 plat).

Ce n'est pas un bug, c'est **l'échelle de temps du modèle** : une salade met 25 tours de la commande au passe, dont 4
de coupe et le reste à marcher ; une soupe 40 à 50. Avec deux robots, une table de trois soupes ne peut pas se faire en
même temps : ses plats arrivent forcément à 20 ou 30 tours d'écart, et la table attend le plus lent. Les 60 tours de
patience, faits pour un plat, ne suffisent pas à une table. Un tour vaut une case de marche comme une minute de
coupe : la marche est bien trop lente devant le travail. C'est la question posée à Sami avant d'aller plus loin.

**La rupture** (`setup.supply`, `src/service-supply.js`) :
- chaque caisse a un stock pour le service ; un plat prend son ingrédient quand un cuisinier prend sa commande à faire
  depuis la caisse (personne ne marche vers une caisse vide), une préparation d'avance aussi ;
- la caisse vide, le plat est retiré (le 86) : ses commandes ouvertes, celles qui arrivent, et une soupe brûlée ou un
  plat mort à refaire sont **refusés**, comptés à part ; une table part sans son plat refusé ; le chef au clavier
  trouve la caisse vide ;
- les mondes de la recherche ont leur propre compte.

**Ce qu'elle donne** (30 services) : les refusées remplacent les manquées (il n'en reste presque plus). Avec 4
ingrédients par caisse, les trois règles font exactement pareil : le stock décide de tout (petite : 12 refusées sur
20, 7,5 à temps). Avec 8, le plat le plus rapide reprend son avance (+0,9 dans la petite, +1,5 dans la grande
brigade). Aucune règle ne choisit encore **à qui donner les derniers oignons** : une commande qui sera servie à temps
plutôt qu'une qui sera en retard. C'est une décision pour la recherche.

Les deux réglages sont dans l'onglet Cuisine, et `npm run compare -- --tables --rupture [n]`.

## Marcher plus vite, deux cases de passe (26/10, Sami)

Sami : d'accord pour **marcher plus vite**, du moment qu'on évite les superpositions ; **deux cases de passe** pour
limiter la congestion.

- **L'allure** (`setup.pace`, `src/service-legs.js`) : un tour compte `pace` pas, un pas une case. Les chemins sont
  réservés pas à pas dans le moteur de mcts-commun : personne ne partage une case ni ne se croise, à aucun pas (un test
  le vérifie pas à pas sur les sept cuisines, à 2 et 3 cases par tour). Le travail (couper, cuire, servir) reste en
  tours ; les seuils qui comparaient des cases à des tours (arriver avant que la soupe brûle, les relais, rendre sa
  place, le poste le plus proche) divisent les cases par l'allure. Le chef au clavier fait autant de pas qu'un robot :
  ses touches remplissent un tour (`pace` pas, ou un E). À `pace` 1, tout est identique à avant (les empreintes).
- **Les deux passes** : un second `S` contre le premier dans les six plans qui n'en avaient qu'un (la grande brigade en
  avait déjà deux), devant une case de sol libre. Les replays gardés rejouent leur plan d'origine.
- **Par défaut : 2 cases par tour** dans toutes les cuisines (`PACE`, `src/kitchens.js`), réglable dans l'onglet
  Cuisine. Les empreintes des règles, des variantes et de la recherche changent ; celle du replay de Sami non.

Mesures (30 services, le cuisinier « le plus urgent », avec les deux passes) : plats à temps avec le plat le plus
rapide, et tables à temps avec la règle de la table :

| Cuisine | pas 1 | pas 2 | pas 3 | pas 4 | attente au passe (pas 1 → 2) | tables à temps, pas 1 → 2 → 4 |
|---|---|---|---|---|---|---|
| petite | 12,6 / 19,9 | 16,9 | 18,4 | 19,0 | 0,7 → 0,0 | 0,8 → 1,5 → 3,0 sur 8,3 |
| en couloir | 5,7 / 13,3 | 8,6 | 10,3 | 10,3 | 18,1 → 25,5 | 0,4 → 0,2 → 0,5 sur 5,8 |
| grande brigade | 16,2 / 34,3 | 25,0 | 29,0 | 31,2 | 29,6 → 12,3 | 0,8 → 2,2 → 5,9 sur 14,3 |
| passe-plats | 7,1 / 15,3 | 11,3 | 13,4 | 13,4 | 0,9 → 1,5 | 0,5 → 1,1 → 1,5 sur 6,5 |
| postes | 8,9 / 19,9 | 13,6 | 14,9 | 17,0 | 0,3 → 0,7 | 0,7 → 0,8 → 1,6 sur 8,3 |
| coupée en deux | 10,4 / 19,9 | 12,0 | 13,1 | 13,4 | 0 → 0 | 0,6 → 1,1 → 1,5 sur 8,3 |
| le grand détour | 7,5 / 19,9 | 15,4 | 17,2 | 18,2 | 0 → 0 | 0,9 → 3,3 → 4,2 sur 8,3 |

- **La seconde case de passe** fait disparaître l'attente au passe dans la petite cuisine (27,9 tours par service →
  0,7), mais ne sert pas un plat de plus au pas 1 : la marche bornait tout. Dans la cuisine en couloir, l'attente reste
  (les deux passes sont au fond d'une impasse) ; dans la grande brigade, cinq cuisiniers pour deux passes, elle baisse
  quand on marche plus vite.
- **Marcher plus vite libère la cuisine** : au pas 2, la petite cuisine sert 85 % des plats à temps, la grande brigade
  73 % (au lieu de 63 % et 47 %). Au pas 3 ou 4, presque tout part à temps : il ne resterait rien à départager entre
  les règles et la recherche. D'où **2** par défaut.
- **Les tables restent ratées à toute allure**, et il meurt même plus de plats au passe quand on marche vite (les plats
  rapides arrivent plus tôt et attendent leurs voisins). Le problème des tables est le nombre de mains, pas la marche :
  voir [`recherche/oublis.md`](recherche/oublis.md).

Toutes les mesures d'avant ce jour (la recherche, les mesures de nuit) étaient au pas 1 avec un passe : elles sont à
refaire.

## Le banquet (26/10, étape 2 de la feuille de route des métiers)

Sami (26/10) : « continue sur les étapes suivantes ». Le banquet (`setup.banquet`, `src/service-banquet.js`,
[`recherche/traiteur.md`](recherche/traiteur.md)) :
- **les commandes sont connues dès le début** : environ 6 couverts (5 à 7, tirés de la graine), une entrée (salade)
  envoyée vers le tour 70, un plat (soupe) vers le tour 130, chaque envoi tiré à ±10 tours de son heure : un traiteur
  ne fait jamais deux fois le même banquet, et les services d'une mesure ne sont pas tous le même ;
- **un plat prêt attend au chaud** (l'étuve : le passe), 60 tours au plus, sinon il est perdu et refait ; un envoi part
  **entier, à son heure et pas avant**, à temps jusqu'à 5 tours après ; c'est la mécanique des tables, un envoi est une
  table qui attend son tour ;
- **la recherche n'a rien à tirer** : toutes les commandes sont connues ; le seul caché est l'humain ;
- **une règle simple de plus, « le rétroplanning »** : le plat dont le début au plus tard (son envoi, moins son
  travail, moins 10 tours de marge, une hypothèse) est le plus proche ; un plat de banquet n'est pas lancé s'il devait
  attendre au chaud plus que l'étuve ne tient. Sans banquet, c'est la commande qui a le moins de marge. La recherche
  joue ses mondes avec elle au banquet.

**Le premier calibrage a échoué** : à 8 couverts et 30 tours au chaud, aucune cuisine n'envoyait jamais une entrée.
Dans la petite cuisine, une salade fait 14 tours de la caisse au passe pour un robot : deux robots en sortent une tous
les 7 tours, soit 56 tours pour 8 salades, et les premières meurent avant que les dernières arrivent. Un vrai traiteur
coupe **en série**, plusieurs portions à la fois ; le modèle fait un plat par voyage (un oubli, `recherche/oublis.md`).
D'où 6 couverts et 60 tours.

**Ce qu'il donne** (20 banquets par cuisine ; envois à l'heure sur 2, et plats perdus au chaud, pour la plus ancienne
/ le plat le plus rapide / la table / le rétroplanning) :

| Cuisine | sans humain | le cuisinier « le plus urgent » |
|---|---|---|
| petite | 0,9 / 0,9 / 0,9 / 1,0 (perdus 5,0 / 5,2 / 1,9 / 1,6) | 0,9 / 0,9 / 0,9 / 0,8 |
| en couloir | 0 partout (8 perdus) | 0,9 partout ; perdus 4 / 4 / 0,9 / 0,6 |
| grande brigade | 0,9 / 0,9 / 1,1 / **1,3** | 0,9 partout |
| passe-plats | 0 / 0 / 0 / **0,5** | 0,3 / 0,3 / 0,3 / **0,9** |
| postes | 0 partout | 0,6 / 0,6 / 0,3 / **0,8** |
| coupée en deux | 0,5 partout | 0,8 partout |
| le grand détour | 0,6 partout | 1,1 / 1,1 / **1,6** / 1,1 (la table : aucun perdu) |

- **Le banquet départage les règles**, ce que le service à la carte au pas 2 ne fait presque plus : le rétroplanning
  l'emporte dans le passe-plats, la grande brigade et « postes », la règle de la table dans le grand détour.
- **Sans humain, c'est parfois pire** : dans la cuisine en couloir, aucun envoi sans le cuisinier, qui apporte des
  mains. Avec le cuisinier « au hasard », presque rien ne part dans trois cuisines (en couloir, passe-plats, postes :
  0,1 à 0,2 envoi sur 2) : il lance des plats à n'importe quel moment, et ils meurent au chaud.
  L'humain qui ne suit pas le plan de production est l'obstacle, et les robots ne le commandent pas : c'est là que
  la recherche, qui imagine ce qu'il va faire, a quelque chose à gagner.
- **La soupe est l'envoi difficile** : deux fourneaux pour six marmites, elles sortent en vagues ; la première attend
  la dernière au chaud (à mesurer : l'attente au chaud par envoi).

Dans l'onglet Cuisine (« Un banquet »), et `npm run compare -- --banquet`.

## La livraison (26/10, étape 3 de la feuille de route des métiers)

La dark kitchen (`setup.delivery`, `src/service-delivery.js`, [`recherche/livraison.md`](recherche/livraison.md)) :
- **chaque commande a son coursier** : la plateforme l'annonce 30 tours après la commande (`sendAt`, connu de tous) ;
  il vient en vrai à ±8 tours de l'annonce (`courierAt`), **ce que personne ne sait avant qu'il soit là** ;
- un plat fini attend son coursier au passe, 15 tours au plus (il refroidit, il est refait) ; **le coursier attend son
  plat 10 tours au plus**, puis repart sans lui : la commande est « partie » ; c'est la mécanique des tables, une
  commande est une table d'un plat, envoyée quand son coursier est là ;
- **la recherche retire, dans chacun de ses mondes, l'heure des coursiers pas encore venus** autour de leur annonce :
  c'est le caché propre à la livraison ; elle joue ses mondes avec le rétroplanning ;
- les commandes elles-mêmes sont celles du service à la carte (le même tirage), les coursiers d'un tirage à part ;
- le poste d'emballage est reporté (`recherche/oublis.md`). Les chiffres sont des hypothèses.

**Un bug trouvé en mesurant** : le coursier repartait pendant qu'un cuisinier finissait son plat ; le cuisinier le
posait au passe, et il partait vers un coursier absent (des attentes de coursier de 16 à 25 tours pour 10 permis).
Quand le coursier repart, tout ce qui tient sa commande est abandonné : le cuisinier (libre, son poste lâché), sa
marmite, son plat sur un comptoir ; et le coursier part avant les envois du tour. Un test le vérifie tour par tour.

**Ce qu'elle donne** (20 services, le cuisinier « le plus urgent ») : plats à temps sans livraison (plat le plus
rapide), puis avec, pour la plus ancienne / le plat le plus rapide / le rétroplanning, et les commandes parties sans
leur plat :

| Cuisine | sans livraison | la plus ancienne | le plus rapide | le rétroplanning | gain du rétroplanning sur la plus ancienne |
|---|---|---|---|---|---|
| petite | 17,5 / 20,7 | 13,4 (7,0 parties) | **13,9** (6,5) | 13,2 (7,3) | −0,30 (−1,14 à 0,54) |
| en couloir | 8,9 / 14,1 | 5,0 (8,8) | **5,4** (8,3) | 4,8 (8,9) | −0,20 |
| grande brigade | 25,6 / 34,4 | 18,8 (15,3) | **21,3** (12,8) | 18,4 (15,7) | −0,40 |
| passe-plats | 12,2 / 15,8 | 9,3 (6,5) | **9,5** (6,3) | 9,2 (6,6) | −0,15 |
| postes | 14,6 / 20,7 | **12,8** (7,7) | 12,1 (8,4) | 12,0 (8,5) | −0,75 |
| coupée en deux | 12,6 / 20,7 | 11,1 (9,3) | **11,3** (9,0) | 10,8 (9,7) | −0,30 |
| le grand détour | 15,6 / 20,7 | 10,8 (9,7) | **11,4** (9,0) | 10,1 (10,3) | −0,70 (−1,32 à −0,08) |

- **Un tiers des commandes part sans son plat** : le coursier n'attend que 10 tours, et la cuisine ne sait pas quand il
  vient ; les coursiers attendent en moyenne 2 à 3 tours un plat servi.
- **Suivre l'heure annoncée n'aide pas** : le rétroplanning fait un peu moins bien que la plus ancienne commande
  (significatif dans le grand détour). L'annonce n'apprend rien de plus que l'heure de la commande (elle en est
  toujours à 30 tours) et se trompe de ±8 tours ; c'est ce caché que la recherche imagine, à mesurer la nuit.

## Les mesures de nuit du 26/10 (deux cases par tour, deux passes)

`night.json`, 22 mesures sur 18 fils (mcts-backlog), de 13 h 09 à 14 h 56 : la recherche contre les règles,
aux réglages par défaut, 50 services par cuisine et par humain ; 30 pour les tables, la rupture, le banquet et la
livraison. Le gain se lit, par paires, contre la plus ancienne commande ; l'écart à la meilleure règle est la
différence de deux gains, sans son intervalle.

**Le service à la carte** (plats à temps : la plus ancienne / le plat le plus rapide / la recherche) :

| Cuisine | le cuisinier « le plus urgent » | gain de la recherche | « au hasard » | sans humain |
|---|---|---|---|---|
| petite | 17,2 / 17,0 / **17,8** | +0,66 (0,27 à 1,05) | 16,2 / 16,3 / **17,5** | 12,2 / 13,4 / **15,7** |
| en couloir | 8,8 / 9,1 / **9,6** | +0,80 (0,40 à 1,20) | 6,1 / 7,9 / **8,3** | 5,1 / 7,4 / **8,2** |
| grande brigade | 23,3 / 24,9 / **28,4** | +5,02 (3,71 à 6,33) | 22,1 / 24,5 / **28,0** | 17,6 / 22,1 / **25,7** |
| passe-plats | 11,5 / 11,6 / **12,1** | +0,60 (0,17 à 1,03) | 11,1 / 11,4 / **12,1** | 7,1 / 7,7 / **10,1** |
| postes | 13,7 / 14,1 / **15,7** | +1,98 (1,23 à 2,73) | 13,3 / 14,0 / **15,4** | 8,3 / 8,6 / **11,7** |
| coupée en deux | 13,9 / 13,2 / **15,3** | +1,42 (0,86 à 1,98) | 13,9 / 13,4 / **15,0** | 6,5 / 10,6 / **11,9** |
| le grand détour | 15,2 / 15,9 / **17,1** | +1,88 (1,08 à 2,68) | 11,6 / 13,9 / **15,2** | 5,2 / 9,8 / **10,7** |

- **La recherche bat toutes les règles, dans les sept cuisines, avec chaque humain et sans humain** ; son gain sur la
  plus ancienne est significatif partout. Au pas 1 (23/10), elle n'était qu'au niveau de la meilleure règle dans
  plusieurs cuisines : marcher plus vite laisse plus de choix à faire.
- **La grande brigade** est là où elle gagne le plus : +5 plats à temps sur 34 avec un humain, +8 sans ; le bon au
  9e décile passe de 61 à 54 tours. Quatre robots, c'est quatre choix qui se gênent ou s'aident.
- La règle « la table » sans tables est la plus ancienne : mêmes chiffres, gain 0.

**Les tables** (30 services, le cuisinier « le plus urgent » ; plats à temps, tables à temps, plats morts au passe) :

| Cuisine | la plus ancienne | le plus rapide | la table | la recherche |
|---|---|---|---|---|
| petite | 4,1 ; 1,9 / 8,3 ; 12,4 | 3,1 ; 1,5 ; 18,5 | 3,2 ; 1,5 ; 13,1 | **6,3 ; 2,7** ; 13,7 |
| grande brigade | 4,4 ; 2,0 / 14,3 ; 19,4 | 4,3 ; 2,0 ; 27,5 | 5,1 ; 2,2 ; 17,5 | **6,9 ; 3,1** ; 22,8 |
| le grand détour | 3,5 ; 1,5 / 8,3 ; 9,4 | 3,0 ; 1,3 ; 11,3 | **7,7 ; 3,3 ; 3,2** | 4,1 ; 1,7 ; 10,0 |

- **La recherche fait avancer les tables** dans la petite cuisine et la grande brigade (+2,2 et +2,5 plats à temps,
  une table de plus), mais elles restent ratées : un tiers des tables à temps au mieux.
- **Dans le grand détour, la règle de la table bat la recherche** (+4,2 contre +0,6) : elle retient les plats qui
  attendraient leurs voisins (3 morts au passe au lieu de 10). La recherche ne l'avait pas dans sa liste courte (le
  plat le plus rapide, la plus ancienne, la caisse la plus proche) : elle jouait ses mondes avec elle, sans jamais
  pouvoir la choisir.

**La rupture** (8 ingrédients par caisse) : la recherche gagne peu avec un humain (+0,1 à +0,7, significatif dans la
grande brigade et avec le cuisinier « au hasard »), +2,3 et +1,3 sans humain ; elle refuse à peine moins de commandes
(19,6 au lieu de 20,1 dans la grande brigade). Elle ne choisit pas encore à qui donner les derniers ingrédients.

**La livraison** (le cuisinier « le plus urgent » ; plats à temps, commandes parties sans leur plat : la plus ancienne /
le plus rapide / le rétroplanning / la recherche) :

| Cuisine | à temps | parties | gain de la recherche | sans humain, à temps |
|---|---|---|---|---|
| petite | 13,1 / 13,3 / 13,0 / **14,1** | 6,6 / 6,4 / 6,6 / **5,6** | +1,00 (0,46 à 1,54) | 8,5 / 11,2 / 7,3 / **12,4** |
| grande brigade | 18,1 / 20,4 / 17,7 / **21,7** | 15,8 / 13,6 / 16,2 / **12,3** | +3,67 (2,50 à 4,83) | 14,0 / 18,7 / 12,9 / **20,5** |
| passe-plats | 8,8 / 8,9 / 8,7 / 8,8 | 6,3 / 6,2 / 6,4 / 6,3 | 0,00 (−0,38 à 0,38) | 5,0 / 5,7 / 4,9 / **6,8** |
| postes | 11,7 / 11,4 / 11,0 / **12,1** | 8,0 / 8,3 / 8,7 / **7,6** | +0,43 (−0,21 à 1,08) | 6,2 / 6,7 / 5,9 / **8,4** |
| le grand détour | 10,7 / 11,2 / 10,1 / **12,5** | 8,9 / 8,4 / 9,6 / **7,1** | +1,83 (0,96 à 2,71) | 4,6 / 7,8 / 3,7 / **8,9** |

- **Imaginer les coursiers paie** : la recherche, qui retire leur heure dans chaque monde, perd moins de commandes
  que toutes les règles, alors qu'elle joue ses mondes avec la pire d'entre elles (le rétroplanning).

**Le banquet : la recherche ne voyait pas l'heure d'envoi.** Dans trois cuisines sur cinq, elle faisait exactement ce
que fait le plat le plus rapide (gain 0,00, de 0,00 à 0,00) ; dans le passe-plats, le rétroplanning gagnait +3,3 et
elle +0,1. Deux raisons, corrigées le soir même (`src/search.js`) :
- ses mondes s'arrêtaient 60 tours plus loin ; au début du service, aucun envoi n'est encore dû, chaque plat y vaut
  « encore à temps », et tous les choix se valent. Au banquet, un monde va maintenant jusqu'au dernier envoi ;
- **elle ne savait pas attendre** : le rétroplanning gagne en ne lançant pas un plat qui mourrait au chaud, la
  recherche lançait toujours quelque chose. Au banquet et à la livraison, attendre est maintenant un de ses coups.
Et sa liste courte commence par le choix de la règle de ses mondes (la table, le rétroplanning) : ce que la règle
ferait, elle peut toujours le faire. Sans tables, banquet ni livraison, rien ne change (les empreintes).

**Remesuré** (30 services, mêmes services ; le cuisinier « le plus urgent » ; plats à temps, envois à l'heure sur 2) :

| Banquet | la plus ancienne | la meilleure règle | la recherche, avant | la recherche, maintenant |
|---|---|---|---|---|
| petite | 5,0 ; 0,8 | 5,0 (toutes) | 5,0 ; 0,8 | **9,2 ; 1,6** (+4,20, de 2,96 à 5,44) |
| passe-plats | 1,6 ; 0,3 | 4,9 ; 0,8 (le rétroplanning) | 1,7 ; 0,3 | **7,5 ; 1,3** (+5,93) |
| postes | 3,4 ; 0,6 | 4,7 ; 0,8 (le rétroplanning) | 3,8 ; 0,7 | **9,0 ; 1,6** (+5,60) |

| Livraison | la meilleure règle | la recherche, avant | maintenant | commandes parties (maintenant) |
|---|---|---|---|---|
| petite | 13,3 (le plus rapide) | 14,1 | **14,3** | 5,4 |
| passe-plats | 8,9 (le plus rapide) | 8,8 | **9,7** | 5,4 |
| postes | 11,7 (la plus ancienne) | 12,1 | **12,4** | 7,3 |
| le grand détour | 11,2 (le plus rapide) | 12,5 | **13,1** | 6,7 |

- **Au banquet, la recherche est maintenant de loin la meilleure** : deux fois plus de plats à temps que la meilleure
  règle, le retard maximal d'un envoi divisé par deux (26 à 43 tours au lieu de 66 à 72). Savoir attendre et voir
  jusqu'à l'envoi, c'est tout le rétroplanning, mais en imaginant aussi ce que fera le cuisinier.
- **À la livraison**, elle gagne un peu plus qu'avant, et maintenant aussi dans le passe-plats.
- La grande brigade et le grand détour au banquet, la grande brigade à la livraison : encore en cours (des mondes
  jusqu'au dernier envoi coûtent cher).

## L'humain qui suit sa table, les mains comptées (26/10, le soir, suite de l'étape 1)

Sami (26/10) : d'accord pour finir l'étape 1 par un humain « qui suit sa table » et une règle qui compte les mains.

**Le cuisinier qui suit sa table** (`HUMANS.table`, `src/rules.js`) : la table la plus ancienne, son plat le plus long
d'abord ; au banquet et pour un coursier, il ne lance pas un plat qui attendrait trop au passe (il attend, comme le dit
le plan de production). Sans tables, c'est la plus ancienne commande : il n'est donc proposé qu'aux services qui ont
des tables (`humansOf` : les tables, le banquet, la livraison), et la recherche ne l'imagine que là. Les services sans
tables sont inchangés (les empreintes, qui ne prennent que les humains de chaque service).

Avec lui (30 services, tables ; plats à temps avec la meilleure règle de chaque cuisine, comparés au cuisinier
« le plus urgent ») :

| Cuisine | « le plus urgent » | « suit sa table » |
|---|---|---|
| petite | 4,3 (le rétroplanning) | **5,5** (le rétroplanning) |
| en couloir | 0,5 | 0,7 |
| grande brigade | 5,1 (la table) | **5,5** (la table) |
| passe-plats | 2,4 (la table) | **3,1** (la table) |
| postes | 1,9 (le rétroplanning) | **3,1** (le rétroplanning) |
| coupée en deux | 2,5 (le plus rapide) | 2,5 (le plus rapide) |
| le grand détour | **7,7** (la table) | 5,4 (la table) |

Un humain qui suit sa table aide dans cinq cuisines sur sept, perd dans le grand détour, et ne sauve pas les tables :
un tiers d'entre elles à temps au mieux.

**Compter les mains : mesuré, pas gardé.** La règle de la table a appris qui fera les voisins d'un plat et quand :
chaque autre cuisinier libre maintenant, ou à la fin de son plat, prend le voisin le plus long d'abord. Sur les sept
cuisines et les quatre humains, 30 services, l'écart sur les plats à temps va de −0,6 à +0,7, **+0,1 en moyenne** : rien.
Avec ces deux recettes (une soupe de 11 tours, une salade de 4), la règle retenait déjà la salade tant que la soupe
n'était pas coupée ; les mains ne changent la décision que rarement. La règle simple reste ; la mesure est notée dans
son commentaire.

**La recherche attend aussi avec les tables.** Le coup « attendre » du banquet (plus haut) sert aussi aux tables : la
règle de la table bat la recherche dans le grand détour parce qu'elle retient les plats qui mourraient au passe. Avec
lui, premier essai (10 services, le grand détour, le cuisinier « le plus urgent ») : la recherche **9,6** plats à temps,
la règle de la table 5,9, la plus ancienne 3,6 ; **3,9 tables sur 8,1 à temps** (la table : 2,5), 2,6 plats morts au
passe (la table : 4,7). Le meilleur résultat des tables jusqu'ici, à confirmer par les mesures de nuit.
