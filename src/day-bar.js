import { addPerson, addStock, at, mark, offer, segment } from "./day-engine.js";
import { MINUTE } from "./day-program.js";
import { LEFT, throwAway } from "./day-waste.js";

/**
 * The bar (Sami, 1/11/2026, docs/journee.md): a barman makes the drinks, an aperitif, wine with the main course, a coffee with
 * the dessert; a waiter takes each round from the bar to its table. A group waiting for a table has a drink at the counter. He
 * keeps the bar stocked from the store. Sources (docs/recherche/journee.md): one barman for 50 to 75 guests, at events, and one
 * in published staffing examples of 80 and 120 covers; the pace and the rounds below are hypotheses (question 36).
 */
export const BAR = Object.freeze({ drink: 25, crate: 24, lowAt: 12, opening: 18 * 3600, setup: 10, closing: 8, pick: 10, serve: 20, rounds: Object.freeze({ entree: 0.7, plat: 0.8, dessert: 0.5 }) });
const PRIORITY = Object.freeze({ round: 72, restock: 75, setup: 60, serve: 78 });
const ROUND_WORDS = Object.freeze({ entree: "les apéritifs", plat: "le vin", dessert: "les cafés" });
const SERVE_AT_THE_BAR = "🍸";

/** A bottle's glass in the bin, a drink at a time. */
function used(world, count) {
  const left = world.stock.get("boissons") ?? 0;
  addStock(world, "boissons", -Math.min(count, left));
  world.barPoured += count;
  while (world.barPoured >= LEFT.drinksABottle) {
    world.barPoured -= LEFT.drinksABottle;
    throwAway(world, "verre", LEFT.bottle);
  }
  world.log.push({ type: "drinks", count, short: Math.max(0, count - left), t: world.t });
  if (left - count < BAR.lowAt && !world.barRestocking) restock(world);
}

/** The barman fetches a crate from the store. */
function restock(world) {
  world.barRestocking = true;
  offer(world, {
    skill: "bar",
    priority: PRIORITY.restock,
    legs: [
      { at: "G", seconds: 30, label: "chercher des boissons", carry: "🍾", take: { G: 1 } },
      { at: "B", seconds: 60, label: "remplir le bar", carry: null, put: { boissons: BAR.crate } },
    ],
    done: () => {
      world.barRestocking = false;
    },
  });
}

/** A round for a table's `course`, made by the barman, then carried by a waiter. `table` is its place, its id for the words. */
export function barRound(world, { table, course, size }) {
  let count = 0;
  for (let guest = 0; guest < size; guest += 1) if (world.rng.next() < BAR.rounds[course]) count += 1;
  if (!count) return;
  addStock(world, "verres", count);
  const openedAt = world.t;
  offer(world, {
    skill: "bar",
    priority: PRIORITY.round - openedAt / 3600,
    legs: [
      {
        at: "B",
        seconds: count * BAR.drink,
        label: `préparer ${ROUND_WORDS[course]} (table ${table.id + 1})`,
        carry: null,
        done: (station) => {
          used(world, count);
          addStock(world, "verres", -count);
          world.log.push({ type: "round", course, seconds: world.t - openedAt, t: world.t });
          carryRound(world, { table, course, station });
        },
      },
    ],
  });
}

/** A waiter takes a round from the bar to its table. */
function carryRound(world, { table, course, station }) {
  const shown = mark(world, station, { emoji: course === "dessert" ? "☕" : "🍷" });
  offer(world, {
    skill: "salle",
    priority: PRIORITY.serve,
    legs: [
      {
        at: "B",
        seconds: BAR.pick,
        label: `prendre ${ROUND_WORDS[course]} au bar`,
        carry: course === "dessert" ? "☕" : "🍷",
        done: () => {
          shown.t1 = world.t;
        },
      },
      { station: table.place, seconds: BAR.serve, label: `servir ${ROUND_WORDS[course]} (table ${table.id + 1})`, carry: null },
    ],
  });
}

/** A group waiting for a table has a drink at the counter, if it is still waiting by then. */
export function atTheCounter(world, group) {
  offer(world, {
    skill: "bar",
    priority: PRIORITY.round,
    legs: [
      {
        at: "B",
        seconds: group.size * BAR.drink,
        label: "servir au comptoir",
        carry: null,
        done: () => {
          if (group.table) return;
          used(world, group.size);
          for (const person of group.members) {
            person.carry = SERVE_AT_THE_BAR;
            segment(world, person, { kind: "wait", label: "prend un verre au bar" });
          }
        },
      },
    ],
  });
}

/** The barman comes in at 18 h, brings two crates and sets up his bar. */
export function startBar(world) {
  world.barPoured = 0;
  world.barRestocking = false;
  addStock(world, "boissons", 0);
  addStock(world, "verres", 0);
  const barman = addPerson(world, { name: "Le barman", mark: "Ba", kind: "barman", skills: ["bar"] }, world.layout.entry);
  at(world, BAR.opening, () => {
    segment(world, barman, { kind: "idle", label: "arrive" });
    const crate = { skill: "bar", priority: PRIORITY.setup, legs: [{ at: "G", seconds: 30, label: "chercher des boissons", carry: "🍾", take: { G: 1 } }, { at: "B", seconds: 60, label: "remplir le bar", carry: null, put: { boissons: BAR.crate } }] };
    offer(world, crate);
    offer(world, { ...crate, legs: [...crate.legs] });
    offer(world, { skill: "bar", priority: PRIORITY.setup - 1, legs: [{ at: "B", seconds: BAR.setup * MINUTE, label: "préparer le bar : glace, citrons, verres", carry: null }] });
  });
}

/** The bar's closing: what is left counted, the counter cleaned, the last glass in the bin. */
export function closeBar() {
  return { skill: "bar", priority: 20, legs: [{ at: "B", seconds: BAR.closing * MINUTE, label: "fermer le bar : compter, nettoyer", carry: null }] };
}
