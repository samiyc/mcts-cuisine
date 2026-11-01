/**
 * The showcase's menu as data (Sami, 1/11/2026, docs/journee.md): eight dishes, each a chain made ahead by batches, and
 * what is left to do at the service. **Every duration is a hypothesis** (question 27); only the cooling's limit has a
 * source (docs/recherche/journee.md).
 *
 * A step of the chain: `do`, its words; `at`, the station; `min`, the minutes someone works there; `skill`, who does it;
 * `fetch`, crates to bring from a store first; `alone`, what goes on once it is left (`{ min, emoji }`), the station kept,
 * someone coming to take it off; `cooks`, it ends a cooking (the time for cooling runs from there); `chill`, it cools.
 */
const chill = (min = 60) => Object.freeze({ do: "mettre en cellule", at: "Z", min: 2, skill: "prep", alone: Object.freeze({ min, emoji: "❄️" }), chill: true });
const shelve = (fridge = "f") => Object.freeze({ do: "ranger au frigo", at: fridge, min: 2, skill: "prep", shelve: true });
/** What the service does: from the fridge, warmed on a stove or in an oven (once, then eaten the same day), plated. */
const warm = (at = "P", min = 3) => Object.freeze({ do: "réchauffer", at, seconds: 30, alone: Object.freeze({ min, emoji: "🔥" }), skill: "chaud" });
const plate = (skill, seconds = 40) => Object.freeze({ do: "dresser", at: "_", seconds, skill });

export const COURSES = Object.freeze(["entree", "plat", "dessert"]);

/** @type {readonly any[]} */
export const MENU = Object.freeze([
  Object.freeze({
    id: "soupe",
    label: "la soupe à l'oignon",
    emoji: "🍲",
    course: "entree",
    batches: 3,
    portions: 12,
    fridge: "f",
    chain: Object.freeze([
      Object.freeze({ do: "éplucher les oignons", at: "C", min: 30, skill: "prep", fetch: Object.freeze({ T: 4 }) }),
      Object.freeze({ do: "émincer les oignons", at: "C", min: 25, skill: "prep" }),
      Object.freeze({ do: "faire suer", at: "P", min: 20, skill: "chaud", fetch: Object.freeze({ G: 1 }), alone: Object.freeze({ min: 40, emoji: "🍲" }), cooks: true }),
      chill(),
      shelve(),
    ]),
    service: Object.freeze([warm("P", 3), plate("chaud")]),
  }),
  Object.freeze({
    id: "terrine",
    label: "la terrine",
    emoji: "🥧",
    course: "entree",
    batches: 3,
    portions: 10,
    fridge: "f",
    chain: Object.freeze([
      Object.freeze({ do: "parer et hacher", at: "C", min: 40, skill: "froid", fetch: Object.freeze({ F: 3 }) }),
      Object.freeze({ do: "monter la terrine", at: "C", min: 20, skill: "froid" }),
      Object.freeze({ do: "enfourner", at: "A", min: 5, skill: "froid", alone: Object.freeze({ min: 70, emoji: "🥧" }), cooks: true }),
      chill(75),
      shelve(),
    ]),
    service: Object.freeze([plate("froid", 50)]),
  }),
  Object.freeze({
    id: "salade",
    label: "la salade de tomates",
    emoji: "🥗",
    course: "entree",
    batches: 3,
    portions: 8,
    fridge: "f",
    late: true,
    chain: Object.freeze([Object.freeze({ do: "laver et trancher", at: "C", min: 30, skill: "froid", fetch: Object.freeze({ T: 2 }) }), shelve()]),
    service: Object.freeze([plate("froid", 45)]),
  }),
  Object.freeze({
    id: "bourguignon",
    label: "le bourguignon",
    emoji: "🥘",
    course: "plat",
    batches: 4,
    portions: 12,
    fridge: "f",
    chain: Object.freeze([
      Object.freeze({ do: "parer la viande", at: "C", min: 35, skill: "chaud", fetch: Object.freeze({ F: 6 }) }),
      Object.freeze({ do: "tailler la garniture", at: "C", min: 30, skill: "prep", fetch: Object.freeze({ T: 1 }) }),
      Object.freeze({ do: "saisir", at: "P", min: 30, skill: "chaud", fetch: Object.freeze({ G: 1 }), alone: Object.freeze({ min: 120, emoji: "🥘" }), cooks: true }),
      chill(),
      shelve(),
    ]),
    service: Object.freeze([warm("P", 5), plate("chaud")]),
  }),
  Object.freeze({
    id: "poisson",
    label: "le poisson",
    emoji: "🐟",
    course: "plat",
    batches: 4,
    portions: 8,
    fridge: "f",
    chain: Object.freeze([Object.freeze({ do: "lever les filets", at: "C", min: 45, skill: "chaud", fetch: Object.freeze({ F: 3 }) }), Object.freeze({ do: "portionner", at: "C", min: 20, skill: "prep" }), shelve()]),
    service: Object.freeze([Object.freeze({ do: "cuire à la minute", at: "P", seconds: 60, alone: Object.freeze({ min: 6, emoji: "🐟" }), skill: "chaud" }), plate("chaud")]),
  }),
  Object.freeze({
    id: "gratin",
    label: "le gratin de légumes",
    emoji: "🥔",
    course: "plat",
    batches: 4,
    portions: 6,
    fridge: "f",
    chain: Object.freeze([
      Object.freeze({ do: "éplucher les légumes", at: "C", min: 30, skill: "prep", fetch: Object.freeze({ T: 3 }) }),
      Object.freeze({ do: "émincer les légumes", at: "C", min: 30, skill: "prep" }),
      Object.freeze({ do: "monter et enfourner", at: "A", min: 15, skill: "chaud", alone: Object.freeze({ min: 50, emoji: "🥔" }), cooks: true }),
      chill(),
      shelve(),
    ]),
    service: Object.freeze([warm("A", 6), plate("chaud")]),
  }),
  Object.freeze({
    id: "tarte",
    label: "la tarte",
    emoji: "🥧",
    course: "dessert",
    batches: 3,
    portions: 12,
    fridge: "d",
    chain: Object.freeze([
      Object.freeze({ do: "faire la pâte", at: "M", min: 30, skill: "patisserie", fetch: Object.freeze({ G: 2 }) }),
      Object.freeze({ do: "foncer et garnir", at: "M", min: 30, skill: "patisserie", fetch: Object.freeze({ T: 1 }) }),
      Object.freeze({ do: "enfourner", at: "A", min: 5, skill: "patisserie", alone: Object.freeze({ min: 40, emoji: "🥧" }), cooks: true }),
      chill(45),
      shelve("d"),
    ]),
    service: Object.freeze([plate("patisserie", 45)]),
  }),
  Object.freeze({
    id: "mousse",
    label: "la mousse au chocolat",
    emoji: "🍮",
    course: "dessert",
    batches: 3,
    portions: 12,
    fridge: "d",
    chain: Object.freeze([
      Object.freeze({ do: "monter la mousse", at: "M", min: 35, skill: "patisserie", fetch: Object.freeze({ F: 2 }) }),
      Object.freeze({ do: "mouler", at: "M", min: 25, skill: "patisserie", fetch: Object.freeze({ G: 1 }) }),
      shelve("d"),
    ]),
    service: Object.freeze([plate("patisserie", 35)]),
  }),
]);

/** A dish's stock in its fridge: the gauge of its portions. */
export const portionsOf = (dish) => `plat:${dish.id}`;
