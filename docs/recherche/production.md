# La production : la série, l'emballage, la plonge, l'hygiène, l'humain, les robots

Recherches du 26/10/2026 au soir (Sami : « si il reste des informations estimées ou des doutes, il faut les vérifier
sur internet ; non trouvables, les renseigner pour un spécialiste »), avant les étapes de la
[feuille de route](feuille-de-route.md) qui les modélisent. Chaque chiffre dit sa source ; ceux qui manquent sont
dans [questions-specialiste.md](questions-specialiste.md).

## L'échelle du temps : un tour vaut environ 30 secondes

Le modèle n'a jamais dit combien vaut un tour. Une hypothèse, **un tour ≈ 30 s**, rend cohérents plusieurs chiffres
qui étaient posés sans source :

| Dans le modèle | En tours | À 30 s | Ce que disent les sources |
|---|---|---|---|
| le coursier attend son plat | 10 | 5 min | Uber Eats vise un coursier reparti en moins de 5 min ; Just Eat facture le restaurant au-delà de 5 min ([Uber][uber-wait], [Just Eat][je-wait]) |
| la patience d'un client | 60 | 30 min | un client de livraison s'impatiente vers 29-30 min ([Tasting Table][tt-patience]) |
| un plat au chaud au banquet | 60 | 30 min | un plat de cuisine centrale se consomme dans les deux heures (repère de qualité, non réglementaire) ; la loi fixe ≥ 63 °C, pas de durée ([recherche Lhôtellerie][hot]) |
| un service | 200 | 1 h 40 | un service du midi ou du soir |
| couper un oignon | 3 | 1 min 30 | 45 à 60 s par oignon pour un cuisinier entraîné, selon des sources peu sûres (aucun standard publié trouvé) |
| cuire une soupe | 8 | 4 min | court pour une soupe : le modèle la suppose préparée d'avance et finie au service |

C'est une hypothèse de travail : la marche (deux cases par tour, une case ≈ un pas) et les gestes n'ont pas la même
source. La question est posée au spécialiste.

## La coupe en série (le banquet)

- **Les machines** : un coupe-légumes professionnel annonce 100 à 500 kg/h, jusqu'à 1 000 kg/h pour un taille-oignons
  industriel ; ce sont des chiffres de fabricants ([making.com][dicer], [Easy Equipment][easyeq]). À la main, aucun
  standard publié (minutes par kilo) n'a été trouvé.
- **Le dressage en ligne** : les traiteurs dressent à la chaîne, et gagnent « une à deux secondes par assiette » en
  technique ([Catersource][catersource]) ; pas de cadence publiée (assiettes par minute).
- **Le personnel** : un cuisinier pour 20 à 30 couverts en restaurant, 8 à 12 cuisiniers pour 100 couverts selon une
  autre page du même éditeur ([modèles de business plan][bp100]) : les sources se contredisent, rien de propre au
  banquet.
- **Pour le modèle** (hypothèse) : couper `k` portions d'un coup prend la coupe d'une portion, plus **un tour par
  portion de plus** (le geste d'installation, sortir la planche et le couteau, ne se refait pas) ; une grande marmite
  cuit `k` portions dans le même temps.

## L'emballage (la livraison)

- **Les erreurs** : DoorDash vise moins de **2,25 %** de commandes avec un article manquant ou faux ([DoorDash][dd-missing]) ;
  une étude d'une dark kitchen fait passer les erreurs d'emballage de **11,8 % à 4,2 %** par une meilleure station
  ([IEOM 2026][ieom]).
- **Le temps** : une vérification finale de 30 s éviterait 80 % des erreurs (un éditeur de logiciel,
  [mydigimenu][digimenu]) ; une simulation lean ramène l'assemblage d'une commande de 1,92 à 1,01 min ([U. Lima][ulima]).
- **Pour le modèle** (hypothèse) : emballer un plat, **2 tours** (une minute) au poste d'emballage.

## La plonge

- **Le lave-vaisselle à capot** : des cycles de 45 s à 3 min ; 30 à 80 paniers par heure ; environ **18 assiettes par
  panier** (1 440 assiettes pour 80 paniers chez Electrolux) ([Electrolux][electrolux], [Hobart][hobart],
  [Blakeslee][blakeslee]).
- **Le repas** : 45 à 75 min à table dans un restaurant traditionnel, 30 à 45 en service rapide
  ([Petpooja][petpooja]) ; une assiette de plat revient donc 20 à 40 min après l'envoi.
- **Pour le modèle** (hypothèse) : une assiette revient sale **50 tours** après l'envoi ; laver un panier de **6
  assiettes** prend **3 tours** (charger, le cycle, vider) ; le stock d'assiettes d'un service, à demander.

## Le ménage et les allergènes

- **Le code couleur** : une planche violette pour les plats sans allergène, d'usage courant ; mais « la planche ne
  suffit pas », c'est la procédure qui compte ([State Food Safety][sfs], [The Staff Canteen][staffcanteen]).
- **Les 14 allergènes** du règlement INCO, à déclarer ([recherche du 26/10, glossaire.md](glossaire.md)).
- **Pas trouvé** : la durée d'un nettoyage de planche entre deux allergènes, la part des commandes « sans ».
- **Pour le modèle** (hypothèse) : nettoyer une planche, **3 tours** ; une commande sur dix « sans oignon ».

## Les pauses, la fatigue, les erreurs de l'humain

- **La loi** : une pause d'au moins 20 minutes consécutives dès 6 heures de travail (Code du travail, L3121-16) ; la
  convention HCR prévoit le repas et la coupure entre deux services ([Code du travail][l3121], [Skello][skello]). À
  l'échelle d'un service de 1 h 40, la pause légale tombe hors du service ; les pauses courtes (une cigarette, les
  toilettes, une réclamation en salle) ne sont pas chiffrées.
- **La fatigue et le risque** : le risque d'accident monte de la première à la deuxième demi-heure de travail continu
  après une pause, puis reste à peu près constant (Tucker, Lombardi, Smith, Folkard 2006, 4 645 accidents)
  ([CDC][cdc-breaks]) ; il monte avec la durée des journées (12 h : +37 %) ([PMC][pmc-hours]) ; les cuisiniers se
  fatiguent plus vite que les serveurs (une petite étude, 13 personnes) ([U. Iowa][iowa]).
- **Les erreurs** : aucun taux de plats refaits publié ; les plateformes visent moins de 2,25 % d'erreurs à la
  livraison (plus haut).
- **Pour le modèle** (hypothèses) : une pause courte de **10 tours** (5 min) une fois par service ; des gestes **10 %**
  plus lents après 100 tours ; une erreur de plat (refait) avec une probabilité de **2 %** par plat, **4 %** fatigué.

## Les pannes des robots

- **Flippy** (Miso Robotics, une friteuse robotisée) : « 99 % de disponibilité » selon le fabricant, sans méthode
  publiée ; une vingtaine de restaurants équipés ; la maintenance confiée à Roboworx ([The Robot Report][robotreport]).
- **Pour le modèle** (hypothèse) : 1 % du temps à l'arrêt, soit **une panne de 10 tours tous les 5 services** environ.

[uber-wait]: https://www.uber.com/au/en/blog/delivery-person-wait-time/
[je-wait]: https://partner.just-eat.co.uk/blog/performance-technology/courier-waiting-times
[tt-patience]: https://www.tastingtable.com/1945221/how-long-food-delivery-should-take/
[hot]: https://www.lhotellerie-restauration.fr/sos-experts/question-reponse/theme/hygiene?page=16
[dicer]: https://making.com/equipment/commercial-onion-dicing-machine
[easyeq]: https://www.easyequipment.com/vegetable-prep-machines.html
[catersource]: https://www.catersource.com/node/6750
[bp100]: https://modelesdebusinessplan.com/blogs/infos/combien-cuisinier-100-couverts
[dd-missing]: https://merchants.doordash.com/en-au/learning-center/most-loved-missing-or-incorrect
[ieom]: https://ieomsociety.org/proceedings/milwaukee2026/67.pdf
[digimenu]: https://www.mydigimenu.com/post/what-is-order-accuracy-in-restaurants
[ulima]: https://cris.ulima.edu.pe/es/publications/operational-model-to-reduce-order-delivery-time-by-applying-lean-/
[electrolux]: https://electroluxprofessional.com/pd/dishwashing-equipment/hood-type-dishwashers/green-clean-hood-type-single-skin-manual/warewashing-green-clean-hood-type-dishwasher-80r-h-505100
[hobart]: https://cdn.shopify.com/s/files/1/0033/0239/1878/files/ECOMAXh615.pdf
[blakeslee]: https://sites.salsify.com/a13f3ccb-4bf7-40cf-bfbc-dbe4b692e813/a381bb01-3761-4968-ae67-bd96df92af4e/en-US/product/D-18-1/D-18-1-Hood-Type-Dishwasher-1Ph/
[petpooja]: https://blog.petpooja.com/operations-workflows/scan-and-order-increases-table-turnover-restaurants/
[sfs]: https://www.statefoodsafety.com/cutting-board-color-chart-guide
[staffcanteen]: https://www.thestaffcanteen.com/News/chopping-boards-does-the-colour-really-matter
[l3121]: https://travail-industrie.com/code-du-travail/l3121-16
[skello]: https://www.skello.io/convention-collective/temps-de-pause-en-restauration
[cdc-breaks]: https://stacks.cdc.gov/view/cdc/185940/cdc_185940_DS1.pdf
[pmc-hours]: https://pmc.ncbi.nlm.nih.gov/articles/PMC1741083
[iowa]: https://iro.uiowa.edu/esploro/outputs/graduate/Fatigue-among-restaurant-workers/9984124171002771
[robotreport]: https://www.therobotreport.com/roboworx-aids-miso-robotics-installation-maintenance-flippy-robots/
