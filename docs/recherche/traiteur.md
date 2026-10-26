# Le traiteur et le banquet

Au restaurant, les commandes arrivent sans prévenir. Chez le traiteur, on sait d'avance **combien de couverts, de
quoi, et à quelle heure**. La difficulté n'est plus de réagir, mais de **planifier** : tout doit être prêt à
l'heure d'envoi, ni trop tôt (le plat attend, refroidit, se perd) ni trop tard. Les termes sont dans
[glossaire.md](glossaire.md).

## Les documents de production

- **La fiche technique** d'un plat : ses phases techniques avec leurs temps et leurs températures, ses denrées,
  le coût par portion ([nomadeducation][nomad-fiche]).
- **Le tableau d'ordonnancement** : chaque phase de la production, sa durée, et un ordre logique
  ([nomadeducation][nomad-fiche]). C'est un **rétroplanning** : on part de l'heure d'envoi et l'on remonte.
- **Le rendement** : la quantité utilisable d'une denrée achetée, pour passer des couverts aux quantités à
  commander ([Easilys][easilys]).
- Un sujet d'examen du brevet professionnel décrit un banquet : la mise en place se fait en amont dans les
  cuisines de l'établissement, puis un chef de partie et son commis assurent l'envoi en liaison mixte et le
  dressage sur site, avec fiche technique, schéma de dressage, fiche HACCP et planification ([BP, sujet U31][bp]).

## Les liaisons

La **liaison froide** sépare la production de la consommation : on produit en cuisine centrale, on refroidit,
on transporte, on remet en température dans une cuisine satellite. Elle permet de grandes séries, faites à
l'avance, au prix d'un travail répétitif ([ac-versailles][versailles] ; [nomadeducation][nomad-liaison]).

Les seuils (arrêté du 21/12/2009, d'après des fiches de cours et une préfecture, à relire sur Légifrance) :
- **liaison chaude** : 63 °C au moins jusqu'au service ([Ardennes][ardennes]) ;
- **refroidissement rapide** : de +63 °C à +10 °C à cœur en moins de 2 h, puis 0 à +3 °C ([ac-strasbourg][strasbourg]) ;
- **remise en température** : pas plus d'1 h entre +10 °C et la température de service ([ac-strasbourg][strasbourg]) ;
- l'heure et la température à cœur se notent au début et à la fin de chaque cycle, à la main sans sonde
  enregistreuse.

Pour le simulateur, ce qui compte est la forme des règles, pas les degrés : **un plat a des fenêtres de temps**.
Cuit, il peut attendre au chaud un temps limité ; refroidi, il se garde, mais il faudra une heure de four avant de
servir. Comme la soupe qui brûle (`setup.unattended`), un plat qui sort de sa fenêtre est perdu.

## Le banquet comme variante du simulateur

- **Les commandes connues d'avance** : N couverts de deux ou trois plats, une heure d'envoi par plat (l'entrée à
  T, le plat à T + 25 tours…). Plus de caché sur les commandes ; le caché qui reste est ce que fera l'humain.
- **L'envoi en série** : un plat d'un banquet part quand ses N assiettes sont dressées. Le dressage devient un
  poste de plus, où l'on enchaîne les assiettes.
- **Le maintien au chaud** : une étuve (un nouveau poste) garde les plats cuits pendant M tours au plus
  (hypothèse ; à l'échelle des 2 h de la règle, si un tour vaut une minute, M serait grand ; on le règle pour que
  la contrainte morde).
- **La règle simple** : le rétroplanning. Chaque plat a une heure de début au plus tard (l'heure d'envoi moins sa
  durée) ; on lance le plat dont cette heure est la plus proche. C'est la règle de la date d'échéance (*EDD*) de
  l'ordonnancement, ou du plus petit retard admissible.
- **La recherche** doit la battre par paires : elle peut lancer plus tôt ce qui tient au chaud, et garder les
  postes libres pour ce qui ne tient pas.
- **Les mesures** : les assiettes envoyées à l'heure, le retard maximal d'un envoi, le temps maximal au chaud, les
  plats perdus.

## Ce qui ne vient pas

- **Le transport** et la cuisine satellite : la liaison froide complète est un autre problème, de logistique,
  plus proche de mcts-entrepot.
- **Les quantités et les achats** (le rendement, la commande aux fournisseurs) : de la gestion, pas du service.

[nomad-fiche]: https://www.nomadeducation.fr/revisions/cap-cuisine-lbcb0b32/les-documents-de-production-et-l-approche-economiq-cycfed34
[nomad-liaison]: https://www.nomadeducation.fr/revisions/metiers-de-l-hotellerie-restauration-seconde-lb8ba708/la-distributionservice-cy512a12
[easilys]: https://help.mapal-os.com/fr/easilys-fr/produits-1/mercuriales-1/garer-les-taux-de-rendement-des-ressources-alimentaires/
[bp]: https://bnseep.eduscol.education.fr/ressources/examens/sujets/16/450/2210400/E3/Sujet%20U31%20.pdf
[versailles]: https://www.hotellerie-restauration.ac-versailles.fr/IMG/pdf/Les_liaisons_chaude_et_froides-_F_Cecconi.pdf
[ardennes]: https://www.ardennes.gouv.fr/index.php/contenu/telechargement/5032/43989/file/Restauration_collective.pdf
[strasbourg]: https://pedagogie.ac-strasbourg.fr/fileadmin/pedagogie/ecogestionpro/filieres_et_ressources/hotellerie_restauration/PMS_-_PRP/guide_PMS/2._BONNES_PRATIQUES_DE_FABRICATION/2.12_REFROIDISSEMENT_RAPIDE.pdf
