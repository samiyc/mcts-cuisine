# Les questions pour un spécialiste

Sami (26/10/2026, le soir) : ce qui n'a pas été trouvé sur internet, rassemblé pour le demander à quelqu'un du
métier, afin de faire coller les simulations à la réalité. Pour chaque question : ce que le modèle suppose en
attendant, où cela pèse, et à qui la poser. Les recherches qui n'ont pas suffi sont dans
[production.md](production.md), [traiteur.md](traiteur.md), [livraison.md](livraison.md),
[indicateurs.md](indicateurs.md). Une réponse obtenue quitte cette liste et va, avec sa source, dans le fichier du
sujet.

Qui : **C** un chef ou un second de cuisine (restaurant à la carte) ; **T** un traiteur (banquets) ; **D** un responsable
de dark kitchen ou de cuisine de livraison ; **P** un plongeur ou un responsable de plonge ; **H** un responsable
qualité, hygiène (HACCP) ; **R** un intégrateur de robots de cuisine.

## L'échelle du temps (tout le modèle)

1. **Combien de temps dure chaque geste ?** (C) Prendre un ingrédient, couper un oignon pour une soupe, couper des
   tomates pour une salade, mettre une marmite au feu, cuire, dresser, envoyer. Le modèle suppose **un tour ≈ 30 s** :
   couper un oignon 3 tours (1 min 30), des tomates 4 (2 min), cuire une soupe 8 (4 min), servir 1. Pèse sur tout : la
   part de la marche et du travail, la place des robots.
2. **Combien de pas entre les postes, et à quelle vitesse marche-t-on en cuisine pendant le coup de feu ?** (C) Le
   modèle fait deux cases par tour (une case ≈ un pas). Une allée de cuisine professionnelle fait-elle 1 m à 1,2 m, comme le
   disent les repères domestiques (NKBA : 1,07 m pour un, 1,22 m pour deux qui se croisent) ? Deux cuisiniers s'y
   croisent-ils sans s'arrêter, ou l'un attend-il l'autre (« chaud derrière ») ? (28/10 : l'option « les cuisiniers se
   croisent », docs/metiers.md.) Sami (28/10) : l'option, deux cuisiniers par case d'allée, reste désactivée jusqu'à
   cette réponse : réaliste si une case fait environ 1 m, pas si elle fait 0,75 m. L'activer change toutes les
   empreintes, la référence serait alors refaite en une fois.
3. **Combien de commandes par heure, et combien de temps un client attend son plat avant de s'impatienter ?** (C) Le
   modèle : une commande toutes les 9 tours environ (4,5 min) dans la petite cuisine, patience 60 tours (30 min).

## Les tables et le passe (étape 1)

4. **Combien de temps un plat peut-il attendre au passe, sous la lampe, avant d'être refait ?** (C) Le modèle : 10
   tours (5 min).
5. **Combien de plats par table, et comment le chef fait-il marcher une table dont les plats n'ont pas la même
   durée ?** (C) Le modèle : 2 ou 3 plats ; un plat part quand les autres de sa table n'en ont plus que pour 4 tours
   de plus que lui.
6. **L'aboyeur : que fait-il concrètement ? Qui lui apporte les plats ?** (C) Le modèle : il tient le passe, annonce et
   réclame ; dans une cuisine sans comptoir, personne ne lui apporte de plat. Une mesure qui ne montre aucun gain.
7. **La mise en place pendant le service : quoi, combien d'avance ?** (C) Le modèle : deux préparations d'oignons
   coupés d'avance au plus ; les salades préparées d'avance bouchent les comptoirs.

## Le banquet (étape 2)

8. **Combien de couverts par cuisinier pour un banquet à l'assiette ?** (T) Les sources disent 20 à 30 par cuisinier
   en restaurant, ou 8 à 12 cuisiniers pour 100 couverts : elles se contredisent. Le modèle : 6 couverts pour 2 ou 3
   cuisiniers (une petite échelle).
9. **Combien de temps un plat tient-il au chaud (≥ 63 °C) sans perdre sa qualité ?** (T, H) La loi ne fixe pas de
   durée. Le modèle : 60 tours (30 min).
10. **À quelle vitesse coupe-t-on en série, et dresse-t-on à la chaîne ?** (T) Combien de temps pour 10 portions
    d'oignons à la main, à la machine ? Combien d'assiettes dressées par minute pour une équipe ? Le modèle : une
    portion de plus coûte un tour (30 s).
11. **L'écart entre l'heure prévue d'un envoi et l'heure réelle ?** (T) Le modèle : ±10 tours (5 min).

## La livraison (étape 3)

12. **Combien de temps pour emballer une commande ?** (D) Le modèle : 2 tours (1 min) par plat.
13. **L'heure annoncée d'un coursier, à combien près est-elle juste ?** (D) Le modèle : annoncé 30 tours (15 min)
    après la commande, réel à ±8 tours (4 min).
14. **Combien de temps un plat prêt attend-il son coursier avant d'être refait ?** (D) Le modèle : 15 tours (7 min 30).
15. **Quelle part des commandes a une erreur (article manquant, faux), et où naît-elle ?** (D) Les sources : 2,25 %
    visé par DoorDash, 4 à 12 % d'erreurs d'emballage dans une étude.

## La plonge

16. **Combien d'assiettes une cuisine a-t-elle pour un service, et combien de temps une assiette met-elle à revenir
    propre ?** (P) Le modèle : une assiette revient sale 50 tours (25 min) après l'envoi ; un panier de 6 assiettes
    lavé en 3 tours.
17. **Qui fait la plonge pendant le coup de feu : un plongeur dédié, ou les commis entre deux plats ?** (P, C)

## L'hygiène et les allergènes

18. **Combien de temps pour nettoyer une planche entre deux préparations, et entre un allergène et un plat « sans » ?**
    (H) Le modèle : 3 tours (1 min 30).
19. **Quelle part des commandes demande un plat sans un allergène ?** (C, H) Le modèle : une sur dix.
20. **À quelle fréquence nettoie-t-on les planches et les postes pendant un service, hors allergènes ?** (H)

## L'humain : pauses, fatigue, erreurs

21. **Pendant un service, quelles pauses prend un cuisinier, et combien de temps ?** (C) La pause légale (20 min dès
    6 h) tombe hors d'un service de 1 h 40. Le modèle : une pause de 10 tours (5 min) par service.
22. **Un cuisinier ralentit-il en fin de service, et de combien ?** (C) Le modèle : ses gestes 10 % plus longs après
    100 tours.
23. **Combien de plats sont refaits par erreur (mauvais plat, mauvaise cuisson), et plus en fin de service ?** (C) Le
    modèle : 2 % des plats, 4 % fatigué.

## Les robots

24. **À quelle fréquence un robot de cuisine tombe-t-il en panne, et combien de temps ?** (R) Le seul chiffre publié est
    celui d'un fabricant (99 % de disponibilité). Le modèle : une panne de 10 tours tous les 5 services environ.
