/**
 * Kitchens drawn as text (Sami, 22/10/2026: change the kitchen to test other configurations; very simple plans
 * first). The legend:
 * - `.` the floor, where cooks move; `R` and `H` are floor too: where the robots and the human start;
 * - `#` a wall;
 * - `_` a counter: cut onions wait there for a stove, one batch a counter (23/10/2026), when robots have roles;
 * - `o`, `t` the onion and tomato crates; `C` a cutting board; `P` a stove; `S` the pass, where dishes are
 *   served. A cook works at one of them from a floor cell beside it; a board or a stove serves one cook at a
 *   time.
 * Each kitchen comes with its service: how often orders come, how long a guest waits, how long the service;
 * and, maybe, the robots' roles (`roles`, in the order the robots appear: `coupe`, `cuisson`, `salade`, or
 * empty for a robot that makes whole dishes).
 */
export const RECIPES = Object.freeze({
  soupe: Object.freeze({ label: "soupe à l'oignon", emoji: "🍲", ingredient: "o", cut: 3, cook: 8 }),
  salade: Object.freeze({ label: "salade de tomates", emoji: "🥗", ingredient: "t", cut: 4, cook: 0 }),
});

export const KITCHENS = Object.freeze({
  petite: Object.freeze({
    label: "Petite cuisine (2 robots et vous)",
    text: ["##o##t##S##", "#.........#", "#.R.H..R..#", "C.........P", "C.........P", "###########"].join("\n"),
    every: 9,
    patience: 60,
    service: 200,
    lastOrder: 160,
  }),
  couloir: Object.freeze({
    label: "Cuisine en couloir (1 robot et vous)",
    text: ["#o#t#####S#", "#.R.....H.#", "###.###.###", "C.........P", "###########"].join("\n"),
    every: 14,
    patience: 70,
    service: 200,
    lastOrder: 160,
  }),
  brigade: Object.freeze({
    label: "Grande brigade (4 robots et vous)",
    text: ["##o#o##t#t##S#S##", "#...............#", "#.R...R.H.R...R.#", "C...............P", "C...............P", "#...............#", "#######C#P#######"].join("\n"),
    every: 5,
    patience: 55,
    service: 200,
    lastOrder: 160,
  }),
  comptoirs: Object.freeze({
    label: "Passe-plats (2 robots et vous, deux comptoirs : un coupe, l'autre cuit)",
    text: ["#o#t#######", "C.H.......#", "C...._....S", "P...._..R.#", "P.......R.#", "###########"].join("\n"),
    every: 12,
    patience: 60,
    service: 200,
    lastOrder: 160,
    roles: Object.freeze(["coupe", "cuisson"]),
  }),
  postes: Object.freeze({
    label: "Des postes (Sami : un robot coupe, l'autre cuit, trois comptoirs entre eux)",
    text: ["##o##t##S##", "#.........#", "C.R..H..R.P", "C.........P", "####___####"].join("\n"),
    every: 9,
    patience: 60,
    service: 200,
    lastOrder: 160,
    roles: Object.freeze(["coupe", "cuisson"]),
  }),
});
