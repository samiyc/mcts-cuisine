import { addStock, mark, offer } from "./day-engine.js";

/**
 * A table's life between two groups (Sami, 1/11/2026, docs/journee.md): cleared, wiped, laid again with what a waiter fetches
 * from the pantry. A group sits only at a laid table. Keeping tables in order all through the service is in the French
 * training standards (France Compétences, docs/recherche/journee.md); no published sequence or duration was found: all are
 * hypotheses (question 35). What each stage looks like is shown on the table: 🧽 to clean, ✨ clean, 🍴 laid.
 */
export const TURN = Object.freeze({ clear: 60, drop: 10, wipe: 45, fetch: 20, lay: 90 });
const PRIORITY = Object.freeze({ clear: 35, wipe: 32, lay: 30, first: 20 });
const LOOKS = Object.freeze({ dirty: "🧽", clean: "✨", laid: "🍴" });

/** A table as a place someone works from: the floor beside its seats. */
export function placeOf(layout, table) {
  const seats = table.seats.map((seat) => layout.stations.s.find((one) => one.x === seat.x && one.y === seat.y));
  return { x: table.x, y: table.y, kind: "table", key: `table:${table.id}`, access: seats.flatMap((seat) => seat.access) };
}

/** A table takes a new state: what it shows, its gauges, its line in the log. */
export function setState(world, table, state) {
  if (table.look) table.look.t1 = world.t;
  table.look = LOOKS[state] ? mark(world, table, { emoji: LOOKS[state] }) : null;
  if (table.state === "laid") addStock(world, "tables:pretes", -1);
  if (state === "laid") addStock(world, "tables:pretes", 1);
  if (table.state === "dirty") addStock(world, "tables:sales", -1);
  if (state === "dirty") addStock(world, "tables:sales", 1);
  table.state = state;
  world.log.push({ type: "table", table: table.id, state, t: world.t });
}

/** The waiter's way to lay `table`: the pantry for cutlery, glasses and linen, then the table. */
function offerLay(world, table, { priority, then = undefined }) {
  offer(world, {
    skill: "salle",
    priority,
    legs: [
      { at: "O", seconds: TURN.fetch, label: "prendre le couvert et le linge", carry: "🍴" },
      {
        station: table.place,
        seconds: TURN.lay,
        label: `dresser la table ${table.id + 1}`,
        carry: null,
        done: () => {
          setState(world, table, "laid");
          then?.();
        },
      },
    ],
  });
}

/** Wiped clean, then laid; `then` once it is ready again. */
function offerWipe(world, table, then) {
  offer(world, {
    skill: "salle",
    priority: PRIORITY.wipe,
    legs: [
      {
        station: table.place,
        seconds: TURN.wipe,
        label: `nettoyer la table ${table.id + 1}`,
        carry: "🧽",
        done: () => {
          setState(world, table, "clean");
          offerLay(world, table, { priority: PRIORITY.lay, then });
        },
      },
      { at: "O", seconds: 5, label: "ranger le chiffon", carry: null },
    ],
  });
}

/** The group gone: what is left of it cleared to the dish room, and the table's turn begins; `then` once it is laid. */
export function turnTable(world, table, { guests, then, glassesBack = undefined }) {
  setState(world, table, "dirty");
  offer(world, {
    skill: "salle",
    priority: PRIORITY.clear,
    legs: [
      { station: table.place, seconds: TURN.clear, label: `débarrasser les verres (table ${table.id + 1})`, carry: "🥂", done: () => offerWipe(world, table, then) },
      { at: "L", seconds: TURN.drop, label: "poser à la plonge", carry: null, done: () => glassesBack?.(guests) },
    ],
  });
}

/** Every table laid before the first guests. */
export function layAll(world, tables) {
  for (const table of tables) {
    table.state = "bare";
    offerLay(world, table, { priority: PRIORITY.first });
  }
}
