/**
 * Kitchens drawn as text (Sami, 22/10/2026: change the kitchen to test other configurations; very simple plans
 * first). The legend:
 * - `.` the floor, where cooks move; `R` and `H` are floor too: where the robots and the human start;
 * - `#` a wall;
 * - `_` a counter: one finished dish may wait there until someone takes it to the pass (23/10/2026);
 * - `o`, `t` the onion and tomato crates; `C` a cutting board; `P` a stove; `S` the pass, where dishes are
 *   served. A cook works at one of them from a floor cell beside it; a board or a stove serves one cook at a
 *   time.
 * Each kitchen comes with its service: how often orders come, how long a guest waits, how long the service.
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
    label: "Passe-plats (2 robots et vous, deux comptoirs)",
    text: ["#o#t#######", "C.H.......#", "C...._....S", "P...._..R.#", "P.......R.#", "###########"].join("\n"),
    every: 12,
    patience: 60,
    service: 200,
    lastOrder: 160,
    /** The human puts a ready dish on a counter when it saves him this many steps or more on the pass. */
    handOff: 0,
  }),
});
