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
 * `passe`, which only serves what is ready, or empty for a robot that makes whole dishes).
 */
export const RECIPES = Object.freeze({
  soupe: Object.freeze({ label: "soupe à l'oignon", emoji: "🍲", ingredient: "o", cut: 3, cook: 8 }),
  salade: Object.freeze({ label: "salade de tomates", emoji: "🥗", ingredient: "t", cut: 4, cook: 0 }),
});

/** Unattended cooking, on in every kitchen (Sami, 23/10/2026): a ready soup burns after 6 turns, a burnt stove takes 5 to clean. */
export const UNATTENDED = Object.freeze({ burn: 6, clean: 5 });

/**
 * The pace, in every kitchen (Sami, 26/10/2026: walk faster, as long as nobody overlaps; service-legs.js): two cells a
 * turn. At one, a cell walked was worth a turn of cutting and the walking bound the whole kitchen (docs/metiers.md);
 * at three or four, nearly every dish goes out in time and nothing is left to tell the rules apart.
 */
export const PACE = 2;

export const KITCHENS = Object.freeze({
  petite: Object.freeze({
    label: "Petite cuisine (2 robots et vous)",
    text: ["##o##t#SS##", "#.........#", "#.R.H..R..#", "C.........P", "C.........P", "###########"].join("\n"),
    every: 9,
    patience: 60,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
  }),
  couloir: Object.freeze({
    label: "Cuisine en couloir (1 robot et vous)",
    text: ["#o#t####SS#", "#.R.....H.#", "###.###.###", "C.........P", "###########"].join("\n"),
    every: 14,
    patience: 70,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
  }),
  brigade: Object.freeze({
    label: "Grande brigade (4 robots et vous)",
    text: ["##o#o##t#t##S#S##", "#...............#", "#.R...R.H.R...R.#", "C...............P", "C...............P", "#...............#", "#######C#P#######"].join("\n"),
    every: 5,
    patience: 55,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
  }),
  comptoirs: Object.freeze({
    label: "Passe-plats (2 robots et vous, deux comptoirs : un coupe, l'autre cuit)",
    text: ["#o#t#######", "C.H.......S", "C...._....S", "P...._..R.#", "P.......R.#", "###########"].join("\n"),
    every: 12,
    patience: 60,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
    roles: Object.freeze(["coupe", "cuisson"]),
  }),
  postes: Object.freeze({
    label: "Des postes (Sami : un robot coupe, l'autre cuit, trois comptoirs entre eux)",
    text: ["##o##t#SS##", "#.........#", "C.R..H..R.P", "C.........P", "###_____###"].join("\n"),
    every: 9,
    patience: 60,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
    roles: Object.freeze(["coupe", "cuisson"]),
  }),
  separee: Object.freeze({
    label: "Coupée en deux (Sami : les oignons et les planches d'un côté, le feu et le passe de l'autre)",
    text: ["##o##t#SS##", "#..._.....#", "C.R._.H.R.P", "C..._.....P", "######CC###"].join("\n"),
    every: 9,
    patience: 60,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
  }),
  detour: Object.freeze({
    label: "Le grand détour (Sami : loin du feu au passe ; le robot 2 au passe, les comptoirs en relais)",
    text: ["##o#t#######", "#..........#", "C.H...#___.#", "C..R.._....#", "#....._..R.#", "#__PP##SS###"].join("\n"),
    every: 9,
    patience: 60,
    service: 200,
    lastOrder: 160,
    unattended: UNATTENDED,
    pace: PACE,
    roles: Object.freeze([null, "passe"]),
  }),
});
