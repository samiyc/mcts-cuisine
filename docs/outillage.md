# L'outillage du dépôt

Sami (26/10/2026, `docs/prompt/recherche-metiers-cuisine.md`) : reprendre ici les bonnes pratiques de lopin, comme
mcts-urgences et mcts-entrepot. La recette est celle de `mcts-urgences/docs/outillage.md`, § « Pour les autres
projets mcts-* », suivie dans son ordre ; les fichiers viennent de mcts-entrepot, le plus proche. Tout passe par une
commande, `npm run check`, que le hook relance avant chaque commit.

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm run check` | le lint, les types, puis les tests ; c'est ce que lance le hook |
| `npm run lint` (`lint:fix`) | eslint, avec le budget de complexité de lopin |
| `npm run types` | tsc vérifie le JavaScript d'après ses commentaires JSDoc, sans rien compiler |
| `npm test` (`test:coverage`) | les tests de `node --test`, dont les empreintes et la longueur des `.md` |
| `npm run compare` | les règles (et `--search`, la recherche) sur les mêmes services |
| `npm run bench` | `scripts/search-bench.js` : la recherche contre les règles, par paires |
| `npm run replay -- fichier.json` | rejoue un service du chef au clavier, dit ce qui a semblé anormal (`--gaps` : les écarts) |
| `npm run changelog` | refait `web/changelog.html` à partir de `docs/changelog.json` |
| `npm run page` | la page, sur le port 4803 (le serveur de mcts-commun) |

## Le budget du lint

La config `eslint.config.js` est celle de l'entrepôt, qui reprend celle de lopin :
- une fonction a au plus 40 lignes, une complexité de 8, une complexité cognitive de 10, 4 paramètres et 20
  instructions ;
- un fichier a au plus 220 lignes ;
- `src/` et `web/` n'importent aucun module `node:*`, parce qu'ils tournent aussi dans le navigateur.

**Quand une règle bloque, on découpe, on ne relève pas la limite.** Le 26/10, la première passe a trouvé 98 erreurs.
Elles ont été corrigées en découpant le long des coutures :
- `simulate.js` (740 lignes) est passé en sept modules. Il garde le service (le tirage des commandes, le départ, le
  tour, les mesures) et ré-exporte ce qu'il exportait : les imports ne changent pas. Les autres modules :
  - `service-basics.js` : les étapes d'un plat, les rôles, les distances aux postes ;
  - `service-legs.js` : les chemins réservés, le poste de chaque étape, où l'on attend, s'écarter, le pas du tour ;
  - `service-relays.js` : partir vers son poste, poser son plat sur un comptoir pour un autre (les relais),
    reprendre un poste à un cuisinier encore loin ;
  - `service-work.js` : le travail qui finit, les marmites qui cuisent et brûlent, les préparations d'avance ;
  - `service-choice.js` : ce qu'on propose à un cuisinier libre, et le prendre ;
  - `service-keys.js` : le chef au clavier (`steer`, `interact`) ;
- `replay.js`, `rules.js` et `web/view.js` en fonctions plus petites ; `runService` prend le modèle de l'humain seul ;
- `web/app.js` (444 lignes) a été réécrit avec la page en onglets (plus bas) ;
- dans les tests, les vérifications d'un tour en petites fonctions.

Ce qui l'a vérifié, en plus des empreintes :
- `npm run compare` sur 20 services de trois cuisines donne la même sortie au caractère près ;
- la vue de la page (`cellsOf`, `cooksOf`, `ordersOf`, `boardOf`, `statusLine`) donne la même chose, avant et après,
  sur 2 800 tours des sept cuisines.

## Les empreintes

`tests/fingerprint.test.js` résume en quatre hachages ce que fait la cuisine :
- **les règles** : chaque cuisine, sous chaque règle, avec chaque humain simulé et sans humain, sur 2 services. On
  hache tout ce que le service a noté, ses mesures, et la case et les compteurs de chaque cuisinier ;
- **les variantes** : les réglages que les cuisines laissent par défaut (la cuisson surveillée, pas de rôles, une
  soupe qui brûle tout de suite) ;
- **le replay** de Sami du 23/10 (`tests/fixtures/chef-on-the-robots-cell.json`), rejoué : ses touches, les robots,
  les anomalies ;
- **la recherche** : un service de la petite cuisine à 16 itérations.

Elles ont été prises avant de toucher au code (commit `4280b5d`), et aucune n'a changé depuis.

Une refonte ne doit changer **aucune** empreinte. Un changement fait exprès pour modifier le modèle met à jour son
hachage. Son commit le dit, avec les mesures avant et après. Une empreinte qui change sans qu'on l'ait voulu est un
bug.

## Les types

`tsconfig.json` vérifie `src/`, `web/` et `scripts/` sans les compiler (`checkJs`, `noEmit`), en mode non strict.
`preserveSymlinks` fait lire le lien `file:` vers mcts-commun comme un module externe.

Les formes que les modules s'échangent sont dans `src/types.js` : la case, le poste, l'étape, le cuisinier, la
commande, la marmite, le service, une règle et ce qu'on lui dit, les mesures, le résumé d'une règle, le replay. Un
module y renvoie avec `@typedef {import("./types.js").Rule} Rule`. La première passe a trouvé 5 erreurs, aucune vraie
faute : un `onTurn` par défaut typé sans ses arguments, et les moyennes d'un résumé.

## Le hook

`.githooks/pre-commit` lance le lint, les types et les tests, ces derniers en bref. Un échec arrête le commit : on
corrige, on ne contourne pas le hook. `npm install` l'active par le script `prepare` (`git config core.hooksPath
.githooks`). Il a été essayé sur un commit avec une variable inutilisée : le commit a été refusé.

## Les fichiers

- `.editorconfig` : UTF-8, des fins de ligne LF, 2 espaces, une ligne vide en fin de fichier.
- `.gitattributes` : du LF partout, dans le dépôt comme sur le disque.
- `.gitignore` : celui de l'entrepôt ; `replays/` y est, les replays de Sami restent sur son disque.
- `tests/md-budget.test.js` : chaque `.md` reste sous 800 lignes, CLAUDE.md sous 300.

## La page en onglets

La disposition de lopin, telle que mcts-urgences l'a reprise le 26/10 :
- **les onglets** dans le bandeau : *Service*, *Cuisine*, *Replays*, *Stats* ; l'onglet ouvert est dans l'adresse
  (`#stats`) et gardé par le navigateur ;
- **le panneau de gauche** tient les réglages de l'onglet ouvert, et se replie (le bouton en bas à gauche), gardé lui aussi ;
- `web/app.js` garde l'état, joue et écoute ; `web/tabs/` donne à chaque onglet son panneau et sa vue ;
  `board.js` dessine le plan et les commandes, `chrome.js` les onglets et le repli, `keys.js` les touches du chef,
  qui ne jouent que dans *Service*.

Vérifiée dans Chrome : le chef au clavier, chaque onglet, le repli, une comparaison, un replay gardé rejoué jusqu'à
la même fin, une cuisine refusée ; aucune erreur de la page dans la console.

## Le journal des versions

`docs/changelog.json` contient le tableau de ce que gagne la recherche, et une entrée par version, la plus récente
d'abord, avec ses commits. `npm run changelog` en fait `web/changelog.html` ; le script est celui de l'entrepôt. Le
26/10, les données ont été tirées de la page telle qu'elle était, et le fichier refait était identique à l'octet près.

## mcts-commun

La cuisine en dépend par `"mcts-commun": "file:../mcts-commun"` : le code vivant, sans version figée. Elle utilise
`createRng`, `search`, `paired`, `astar`, `createReservations` et `parsePlan`, ainsi que le serveur de la page
(`bin/serve.js`, les replays), `web/theme.css` et `mcts-backlog` (par `night.json`). Le contrôle de mcts-commun
lui-même (son lint, ses types, son hook) appartient à sa propre session, comme le prévoit urgences.

À proposer à mcts-commun, plus tard : la disposition en onglets et son CSS sont maintenant écrits deux fois (urgences
et cuisine), presque à l'identique ; ils pourraient rejoindre `web/theme.css`.

## Les mesures longues passent par la file (Sami, 26/10/2026, le soir)

Toute mesure de plus de quelques minutes (la recherche sur 30 services, une cuisine entière, le banquet de la grande
brigade) passe par **la file de la machine**, `mcts-backlog` (mcts-commun) : un job (`mcts-backlog --add ID --cwd
mcts-cuisine --estimate "1 h" --limit 240 -- npm run compare -- …`) ou un fichier de jobs (`night.json`, ajouté par
`mcts-backlog --add-file mcts-cuisine/night.json --tag <série>`). La file partage les 18 fils entre les projets, garde
la température et la mémoire, et range les sorties dans `~/.mcts-backlog/runs/`. Le 26/10, huit mesures lancées à
côté de la file tournaient pendant qu'elle occupait déjà tous les fils : tout ralentissait.

- **Un job par cuisine et par cuisinier simulé** (`npm run compare -- --humain urgent`) : les jobs tiennent dans leur
  `limit` et se partagent les fils ; la grande brigade et le banquet ont un `limit` large (jusqu'à 720 min).
- **À la main**, seulement les essais courts : moins de 10 services, un cuisinier, quelques minutes.
- **Pendant qu'une file tourne**, le dépôt reste utilisable à chaque instant : un job démarre avec le code tel qu'il
  est sur le disque.
