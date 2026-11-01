/**
 * The showcase's day as data (Sami, 1/11/2026, docs/journee.md, docs/recherche/journee.md): its hours, its brigade, what
 * the truck brings. **Every figure here is a hypothesis** unless a source is named (questions-specialiste.md, 25 to 33):
 * the sources give the order of the phases, not their hours. A lunch service would be another entry of `PHASES`.
 */
export const HOUR = 3600;
export const MINUTE = 60;
/** A cell is about a metre, walked in 2 s with a crate or a pan, a careful walk among others (hypothesis, question 2). */
export const WALK = 2;
export const START = 8 * HOUR;

/** The phases, each from its hour to the next one's. The page's band shows them, and jumps to them. */
export const PHASES = Object.freeze([
  Object.freeze({ id: "reception", label: "Réception", from: START }),
  Object.freeze({ id: "production", label: "Production", from: 8.75 * HOUR }),
  Object.freeze({ id: "miseEnPlace", label: "Mise en place", from: 16.5 * HOUR }),
  Object.freeze({ id: "repas", label: "Repas d'équipe", from: 17.5 * HOUR }),
  Object.freeze({ id: "service", label: "Service", from: 19 * HOUR }),
  Object.freeze({ id: "fermeture", label: "Fermeture", from: 22.5 * HOUR }),
]);

/**
 * The brigade: each one's name, the short mark the plan shows, and what they do, their own work first. `control` checks
 * the delivery (one who can refuse a product, Assurup in docs/recherche/journee.md).
 */
export const BRIGADE = Object.freeze([
  Object.freeze({ name: "Le chef", mark: "Ch", skills: Object.freeze(["passe", "control", "chaud", "prep"]) }),
  Object.freeze({ name: "Le second", mark: "2d", skills: Object.freeze(["chaud", "control", "prep"]) }),
  Object.freeze({ name: "Chef de partie 1", mark: "P1", skills: Object.freeze(["chaud", "prep"]) }),
  Object.freeze({ name: "Chef de partie 2", mark: "P2", skills: Object.freeze(["chaud", "prep"]) }),
  Object.freeze({ name: "Garde-manger", mark: "GM", skills: Object.freeze(["froid", "prep"]) }),
  Object.freeze({ name: "Pâtissier", mark: "Pâ", skills: Object.freeze(["patisserie", "prep"]) }),
  Object.freeze({ name: "Commis 1", mark: "C1", skills: Object.freeze(["prep", "froid", "chaud"]) }),
  Object.freeze({ name: "Commis 2", mark: "C2", skills: Object.freeze(["prep", "chaud", "froid"]) }),
  Object.freeze({ name: "Commis 3", mark: "C3", skills: Object.freeze(["prep", "patisserie", "plonge"]) }),
  Object.freeze({ name: "Plongeur", mark: "Pl", skills: Object.freeze(["plonge", "prep"]) }),
]);

/**
 * What the truck brings, in crates by store, the cold first (the chilled goes back to the cold as fast as possible,
 * Genève in docs/recherche/journee.md). `control`, the check of a lot; `take` and `put`, a crate's gestures, in seconds.
 */
export const DELIVERY = Object.freeze({
  lots: Object.freeze([
    Object.freeze({ store: "F", label: "le frais", emoji: "🥩", crates: 60, priority: 30 }),
    Object.freeze({ store: "T", label: "le tempéré", emoji: "🥔", crates: 40, priority: 20 }),
    Object.freeze({ store: "G", label: "l'épicerie", emoji: "🥫", crates: 24, priority: 10 }),
  ]),
  control: 5 * MINUTE,
  take: 15,
  put: 15,
});
