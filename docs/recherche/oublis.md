# Les oublis

Sami (26/10/2026) : « Note les oublis dans les docs & changelog html ». Ce que les étapes 0 et 1 de la
[feuille de route](feuille-de-route.md) ont laissé de côté, ce qu'elles ont découvert en chemin, et ce que les
recherches ([glossaire.md](glossaire.md), [indicateurs.md](indicateurs.md)) annonçaient sans que ce soit fait. Chaque
point dit où il se rangera.

## Découverts en chemin

- **Les tables manquent de mains.** Avec deux robots et un cuisinier, une table de trois plats ne peut pas se faire en
  même temps ; ses plats arrivent au passe à 20 ou 30 tours d'écart, et le premier meurt avant le dernier. Marcher plus
  vite n'y change rien, il en meurt même davantage (les plats rapides arrivent plus tôt). Pistes, à mesurer :
  - **la règle « la table » compte les mains libres** : elle ne fait marcher un plat que si un cuisinier pourra faire
    les autres en même temps ; aujourd'hui elle ne retient jamais deux plats identiques ;
  - **une patience par table**, proportionnelle à sa taille ;
  - **un passe chauffé** (une lampe) : le plat y tient plus longtemps, comme dans les vraies cuisines.
  Rangé : étape 1, à reprendre avec les mesures de nuit du 26/10 (la recherche sur les tables).
- **La rupture ne choisit pas à qui donner les derniers ingrédients.** Avec un stock serré, toutes les règles font
  pareil : la première commande prise vide la caisse. Une commande qui sera servie à temps vaut mieux qu'une qui sera en
  retard. Rangé : la recherche (étape 4 des urgences, ici après l'étape 3).
- **Un poste réservé n'est pas un poste au travail.** Dans la cuisine coupée en deux, les fourneaux sont attendus 56
  tours par service pour 23 % d'usage : un cuisinier encore loin les réserve. Le temps « réservé sans travailler »
  n'est pas compté. Rangé : étape 0, une mesure de plus.
- **L'impasse du passe** : dans la cuisine en couloir, les deux passes sont au fond d'une impasse et l'attente reste
  (18 à 25 tours par service). Un plan à revoir, si Sami le veut.
- **Les mesures d'avant le 26/10** (la recherche, les mesures de nuit du 23/10) étaient au pas 1, avec un seul passe :
  elles sont refaites par `night.json`.

## Annoncés, pas encore faits

- **L'aboyeur qui réclame** ([brigade-service.md](brigade-service.md)) : le rôle `passe` en est l'ébauche ; il pourrait
  annoncer les tables, réclamer le plat qui manque, et ne servir que les tables complètes. Rangé : étape 1.
- **La mise en place** : reportée par Sami (26/10) ; c'est le chantier des robots en avance (`docs/modele.md`, « La
  suite » 3) : une nouvelle décision pour les règles et la recherche (quoi préparer, combien), et trois cuisines sans
  comptoir pour la poser. Rangé : une étape à part, après les tables et la rupture.
- **Les humains simulés ignorent les tables et la rupture** : « le plus urgent » prend un plat sans regarder sa table.
  Le modèle de l'humain est le cœur du projet : un quatrième humain, « qui suit sa table », à mesurer. Rangé : étape 1.
- **Les indicateurs pas encore comptés** ([indicateurs.md](indicateurs.md)) : les bons par tranche de tours (une
  courbe du service), les plats servis par chaque robot, le temps réservé sans travailler. Rangé : étape 0.
- **La recherche sur les tables et la rupture** : son évaluation compte les plats à temps ; avec les tables, c'est la
  table qui compte, et un plat mort au passe n'y pèse pas. Rangé : après les mesures de nuit.
- **La plonge, les allergènes, la fatigue, les menus en plusieurs temps** : prévus « plus tard » dans la
  [feuille de route](feuille-de-route.md), étape 4.
- **Les étapes 2 (le banquet) et 3 (la livraison)** : pas commencées.

## Fait depuis

Les oublis réglés quittent cette liste et vont dans [modele.md](../modele.md) avec leurs mesures.
