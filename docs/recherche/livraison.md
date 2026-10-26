# La dark kitchen et la livraison

Une cuisine sans salle : les commandes viennent des plateformes, des coursiers les emportent. La contrainte nouvelle
est **un rendez-vous à deux** : le plat doit être prêt quand le coursier arrive. Trop tôt, il refroidit au passe ;
trop tard, le coursier attend, et il a d'autres courses. Les termes sont dans [glossaire.md](glossaire.md).

## Ce que disent les sources

- **Le flux en ligne** : une dark kitchen bien conçue fait aller les produits dans un seul sens, de la préparation
  à la cuisson, à l'assemblage, à l'emballage, puis au départ ([CloudKitchens][cloudkitchens]).
- **Pas de capacité type** : le volume dépend du plan, de l'équipe, de la carte, des équipements et de la
  demande ([CloudKitchens][cloudkitchens]).
- **Le temps de préparation supposé** : les plateformes envoient les coursiers d'après un temps de préparation
  estimé ; ils arrivent trop tôt, trop tard, ou tous ensemble, ce qui fait des goulots en cuisine
  ([Syrve][syrve]). C'est le cœur du problème pour le simulateur : l'heure du coursier est **un caché** qui dépend
  d'une estimation, et la cuisine doit s'y adapter.
- **L'écran de cuisine** affiche chaque commande avec son temps de préparation, sa priorité et son heure limite
  ([dev.family][devfamily]).
- **Des ordres de grandeur** (à ne pas prendre comme références) : chez Deliveroo au Royaume-Uni, d'après un article sur sa dark kitchen de Leeds, 27
  minutes en moyenne de la commande à la porte, dont 6 sur la route ([Yorkshire Evening Post][yep]) ; un éditeur
  dit que « tout casse » au-delà de 30 commandes par heure ([dev.family][devfamily]). Les chiffres des pages de
  statistiques sans sources (8 à 10 minutes de préparation, 200 commandes par heure) sont écartés.
- **Les mesures** proposées par un éditeur : le délai moyen de livraison, les commandes par coursier et par heure,
  la part des livraisons en retard, les interventions manuelles, le coût par commande ([dev.family][devfamily]).

## La livraison comme variante du simulateur

- **Les coursiers** : chaque commande a une heure d'arrivée de son coursier, tirée de la graine autour de l'heure
  annoncée (hypothèse : un écart de quelques tours, à régler). Le coursier attend au passe, puis repart avec la
  commande, ou sans elle s'il a trop attendu.
- **L'emballage** : un poste de plus après le dressage, qui ne sert qu'à un à la fois comme une
  planche.
- **Le plat qui attend** : comme au passe d'un restaurant, il perd sa qualité au-delà de quelques tours.
- **Plusieurs enseignes** sous un toit : deux cartes, partageant les postes.
- **La règle simple** : préparer dans l'ordre des coursiers annoncés. La recherche doit la battre en jouant sur
  l'incertitude de leur arrivée.
- **Les mesures** : l'attente des coursiers (moyenne et **maximale**), l'attente des plats au passe, les commandes
  parties en retard ou sans coursier.

## Ce qui ne vient pas

- La tournée des coursiers, le choix de la plateforme, les frais : un problème de logistique, hors de la cuisine.

[cloudkitchens]: https://cloudkitchens.com/blog/ghost-kitchen-operations
[syrve]: https://www.syrve.com/en-gb/blog/dark-kitchen-tech
[devfamily]: https://dev.family/blog/article/from-chaos-to-control-building-delivery-systems-that-let-dark-kitchens-grow
[yep]: https://www.yorkshireeveningpost.co.uk/news/see-what-happens-when-you-place-order-restaurant-leeds-deliveroo-editions-dark-kitchen-484079
