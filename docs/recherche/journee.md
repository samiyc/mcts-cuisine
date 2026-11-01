# La journée d'un restaurant, du retour des courses à la fermeture

Sami (1/11/2026) veut une cuisine vitrine : 10 cuisiniers, une journée entière, et le visuel du grand CHU de
mcts-urgences. Ce fichier dit ce que les sources publiées disent de cette journée, et ce qui reste une hypothèse. Le
modèle qui s'en sert est décrit dans [../journee.md](../journee.md). Ce qui n'a pas été trouvé va dans
[questions-specialiste.md](questions-specialiste.md), questions 25 à 36.

## Le déroulé

Aucune source n'en donne un horaire de référence : **les heures du modèle sont des hypothèses**. Les sources s'accordent
sur l'ordre des phases.

- **Le matin** : la prise de poste se fait vers 7 h à 8 h. On réceptionne et contrôle les livraisons, on fait le point
  sur le stock, on lance la mise en place, et le chef fait un briefing ([YouSchool][youschool],
  [Choose and Connect][choose]).
- **La préparation** : découper, mariner, dresser les postes, pour aller plus vite pendant le coup de feu
  ([un guide de déroulé][logbook]). C'est ce que Sami a retenu de ses échanges : préparer le plus possible à l'avance.
- **La coupure** : elle est courante dans le métier, par exemple 10 h-15 h puis 18 h-22 h dans une offre d'emploi
  ([France Travail][coupure]). Le modèle n'en a pas : l'équipe enchaîne, avec une pause et le repas d'équipe. Une vraie
  coupure ferait une après-midi vide à l'écran, et elle dépend de l'établissement.
- **Le service** : le commis dresse et aide les cuisiniers pendant le coup de feu ([YouSchool][youschool]).
- **La fermeture** : chaque poste commence à se défaire pendant la dernière heure ; ensuite le nettoyage, les frigos,
  la rotation des stocks, ce qu'il faut préparer pour le lendemain ([Toast][toast-closing]). Le commis lave la batterie
  de cuisine et nettoie les locaux ([offre de commis][commis]).

## La réception et le rangement

- Chaque livraison est un point de contrôle : fournisseur, température, quantité, qualité, dates, allergènes
  ([Assurup][assurup]). Il faut savoir qui accueille le livreur et qui peut refuser un produit.
- Il n'y a pas de température unique : elle dépend de la denrée. Un document du canton de Genève donne, à titre
  d'exemple, 4 °C au plus pour les produits carnés et 5 °C pour les denrées très périssables ; le réfrigéré retourne
  au froid le plus vite possible ([Genève][geneve]). Le modèle ne suit pas les degrés (décision du 26/10 dans la
  feuille de route) : **le froid est rangé d'abord**, puis le tempéré, puis l'épicerie.
- Le stock tourne : premier entré, premier sorti, les plus vieux devant ([FoodSafe][foodsafe]).

## Ce qui est cuit d'avance : les règles sourcées

Ce sont les seuls chiffres sûrs de ce fichier. Ils viennent d'un guide de bonnes pratiques d'une académie, qui reprend
le texte réglementaire ; à vérifier sur Légifrance avant toute citation juridique.

- **Refroidir** : de +63 °C à moins de +10 °C à cœur en **moins de 2 heures**, sinon la préparation est jetée
  ([guide PMS][pms]).
- **Conserver** : entre 0 et +3 °C ensuite ([guide PMS][pms]).
- **Remettre en température** : pas plus d'**1 heure** entre +10 °C et la température de service, +63 °C au moins, et
  consommé **le jour de la première remise en température** (texte cité par [une fiche professionnelle][hellopro]).

Dans le modèle : un lot cuit doit finir en cellule moins de 2 h après la fin de sa cuisson (invariant testé) ; une
portion n'est réchauffée qu'une fois.

## Le corps et les pauses

- **La loi** : 20 minutes consécutives de pause dès 6 heures de travail (art. L3121-16 du Code du travail,
  [service-public][sp]). Une convention peut prévoir plus ([Skello][skello]). Le repas d'équipe peut en tenir lieu s'il
  est pris comme une pause : à confirmer (question 29).
- **Les 15 minutes dehors** sont le choix de Sami, par la porte de derrière. Elles s'ajoutent au repas d'équipe du modèle.
- **La chaleur** : les guides recommandent de l'eau à disposition, des pauses au frais et des rotations sur les postes
  chauds ([Food Alert][foodalert], [Shield Safety][shield]). Un rapport américain décrit le décès d'un commis par coup
  de chaleur, avec des pauses trop rares ([MIFACE][miface]). **Aucune source sérieuse ne donne de litres par heure** :
  la soif et la fatigue du modèle sont des hypothèses, qui servent d'abord à montrer qui va mal.

## La salle

Ces chiffres viennent d'éditeurs de logiciels et de sites d'emploi : des ordres de grandeur, pas des références.

- **Les serveurs** : un pour 4 ou 5 tables en service complet, 3 ou 4 en gastronomie ([OysterLink][oyster]).
- **La rotation** : une table dure de 45 min à 1 h 30 ; 3 à 4 rotations par service en restauration classique, 1 à 2
  en gastronomie ([Restaurant365][r365], [TouchBistro][touchbistro]).
- **Le déroulé d'une table** : les recherches n'ont pas donné de séquence publiée avec ses durées. Celui du modèle
  (accueil, commande, trois temps, addition, débarrassage) vient de [brigade-service.md](brigade-service.md) et d'hypothèses.

## Les déchets

- **Le tri des biodéchets est obligatoire** pour tous les professionnels depuis le 1ᵉʳ janvier 2024, quels que soient les
  volumes (loi AGEC ; [CCI Limoges][cci], [Grand Poitiers][poitiers]). Le modèle sépare donc quatre flux : les biodéchets, les
  cartons, le verre, les ordures.
- **Le seul chiffre trouvé** : un repas produit en moyenne 134 g de biodéchets, selon [un document de Veolia][veolia]. Il ne
  précise pas qu'il parle de restaurants, et sa source d'origine n'a pas été retrouvée. Le modèle s'en sert comme d'un repère :
  il donne environ 143 g par client. Les quantités de cartons, de verre et d'ordures sont des hypothèses (question 34).

## Le nettoyage et le dressage des tables

La remise en état des tables pendant tout le service et la préparation de la salle figurent dans les référentiels de formation
([France Compétences][fc]) ; [Square][square] les attribue aux commis débarrasseurs. **Aucune source ne donne l'ordre des gestes
ni leur durée** : débarrasser, essuyer, chercher le couvert à l'office puis dresser sont des hypothèses (question 35).

## Le bar

Les ratios trouvés viennent surtout d'organisateurs d'événements : un barman pour 50 à 75 invités ([EventPlanning][ep]). Pour un
restaurant, [un exemple d'effectif][nmbrs] compte un barman pour 80 couverts, et un autre pour 120. **Rien de publié sur le temps
de préparation d'un verre ni sur la différence entre un bar de service et un comptoir** (question 36).

## Le grand CHU : pourquoi il tient

Sami : « la plupart des chemins sont pré-calculés et en cache ». C'est bien ce que fait mcts-urgences :

- les distances sont calculées une fois par cible (`ward-moves.js`), et les chemins une fois par paire de cases (`pathOf`,
  `pathway-cells.js`) ;
- les allées ne se réservent pas : plusieurs personnes peuvent passer sur une même case, et l'écran les écarte un peu ;
- une journée se calcule une seule fois et produit une trace de marches, que la page rejoue (`walkScene`,
  `pathway-walk.js`).

La cuisine actuelle, elle, planifie chaque pas dans le temps pour éviter les autres (A*), ce qui ne tiendrait pas sur 16 h
avec des dizaines de personnes. La journée reprend donc la méthode du CHU, dans un modèle à part. mcts-commun a déjà
les distances gardées par cible (`createDistances`).

[cci]: https://www.limoges.cci.fr/sites/g/files/mwbcuj1461/files/2023-09/solutions%20collecte%20valorisation%20biodechets.pdf
[poitiers]: https://www.grandpoitiers.fr/fileadmin/M%C3%A9dias_par_groupes_de_contributeurs/Economie_emploi_et_entreprises/03-d%C3%A9chets/GP_2022_contexte_reglementaire_biodechets_pro.pdf
[veolia]: https://www.veolia.fr/sites/g/files/dvc2401/files/document/2019/12/934_VEOLIA_article_9-biod%C3%A9chets_1219.pdf
[fc]: https://certifpro.francecompetences.fr/api/fiches/refActivity/24400/472405
[square]: https://squareup.com/ca/fr/townsquare/how-to-manage-your-restaurant-front-of-house
[ep]: https://eventplanning.com/bartender-staffing-placement/
[nmbrs]: https://kitchennmbrs.app/en/knowledge-base/daily-control/how-do-i-set-a-labor-standard-per-service-for-my-restaurant-type
[youschool]: https://www.youschool.fr/metiers-de-bouche/comment-travaille-un-cuisinier
[choose]: https://www.chooseandconnect.com/explorer-metiers/chef-de-cuisine
[logbook]: https://www-logbook-lk.pages.dev/blog/how-restaurant-operations-work/
[coupure]: https://candidat.francetravail.fr/offres/recherche/detail/189SJFW
[commis]: https://www.randstad.fr/emploi/commis-de-cuisine-fh_rodez_001-kt-1770825_01c/
[toast-closing]: https://pos.toasttab.com/resources/kitchen-opening-closing-checklist
[assurup]: https://www.assurup.com/blog/articles/reception-marchandises-restaurant
[geneve]: https://www.ge.ch/document/15362/telecharger
[foodsafe]: https://www.foodsafe.ca/docs/Receiving_&_Storage_Guidelines.pdf
[pms]: https://pedagogie.ac-strasbourg.fr/fileadmin/pedagogie/ecogestionpro/filieres_et_ressources/hotellerie_restauration/PMS_-_PRP/guide_PMS/2._BONNES_PRATIQUES_DE_FABRICATION/2.12_REFROIDISSEMENT_RAPIDE.pdf
[hellopro]: https://conseils.hellopro.fr/quelles-normes-s-appliquent-aux-cellules-de-refroidissement-3950.html
[sp]: https://www.service-public.gouv.fr/particuliers/vosdroits/F34555?lang=en
[skello]: https://www.skello.io/convention-collective/temps-de-pause-en-restauration
[foodalert]: https://foodalert.com/hot-kitchens-summer-reducing-risk
[shield]: https://shieldsafety.co.uk/resources/blog/six-top-tips-for-working-in-a-hot-kitchen/
[miface]: https://oem.msu.edu/images/MIFACE_Constr_Div/Case277.pdf
[oyster]: https://oysterlink.com/spotlight/how-many-tables-do-waiters-serve-at-a-time
[r365]: https://restaurant365.com/?p=53537
[touchbistro]: https://www.touchbistro.com/blog/improving-your-restaurants-table-turnover-rate/
