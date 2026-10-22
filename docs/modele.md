# Le modèle de la cuisine, première version (22/10/2026)

Un service joué tour par tour, sans recherche encore : des commandes qui arrivent, des recettes en
étapes, des postes qu'on ne partage pas, des robots et un cuisinier humain simulé.

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

## La suite

1. **Deviner le cuisinier** : les robots tirent ce qu'il va probablement prendre (son modèle) et choisissent
   en conséquence, par la recherche (`search` de `mcts-commun`). C'est le cœur du projet : Carroll et al.
   (2019) ont montré qu'un agent qui ne s'est entraîné qu'avec lui-même coordonne mal avec un humain.
2. **Jouer le cuisinier** dans la page, au clavier, avec les robots.
3. **Des recettes plus longues** (plusieurs ingrédients), et poser un ingrédient sur le comptoir pour qu'un
   autre le reprenne.
