import { paired } from "mcts-commun/measure.js";
import { RECIPES } from "./kitchens.js";
import { runService } from "./simulate.js";

/** @typedef {import("./types.js").Measures} Measures */
/** @typedef {import("./types.js").Rule} Rule */
/** @typedef {import("./types.js").Summary} Summary */

/**
 * Who takes which order. A rule (for the robots) and a human model are both `(open, { t, reach, rng }) =>
 * order`: `open` the orders nobody has taken, `reach(order)` the floor distance to its ingredient's crate.
 */
const first = (open, before) => open.reduce((best, order) => (before(order, best) ? order : best));
/** The work left on an order: cut onions waiting on a counter have only their cooking left, a dish ready to serve (on a stove or a counter) nothing. */
function workOf(order) {
  const { cut, cook } = RECIPES[order.recipe];
  if (order.status === "ready" || (order.status === "prepped" && (order.cooked || cook === 0))) return 0;
  return order.status === "prepped" ? cook : cut + cook;
}

/** @type {Readonly<Record<string, Rule>>} */
export const RULES = Object.freeze({
  /** The order that came first. */
  oldest: (open) => first(open, (a, b) => a.arrival < b.arrival),
  /** The quickest dish first, the older between equals: more dishes out, the long ones wait. */
  quickest: (open) => first(open, (a, b) => workOf(a) < workOf(b) || (workOf(a) === workOf(b) && a.arrival < b.arrival)),
});
export const RULE_LABELS = Object.freeze({ oldest: "la plus ancienne", quickest: "le plat le plus rapide", search: "recherche (ISMCTS)" });

/** Three simulated humans (docs: the human's model is the heart of the project; start with three). */
/** @type {Readonly<Record<string, Rule>>} */
export const HUMANS = Object.freeze({
  nearest: (open, { reach }) => first(open, (a, b) => reach(a) < reach(b)),
  urgent: (open) => first(open, (a, b) => a.deadline < b.deadline),
  random: (open, { rng }) => open[rng.int(open.length)],
});
export const HUMAN_LABELS = Object.freeze({ nearest: "prend le plus proche", urgent: "prend le plus urgent", random: "prend au hasard", clavier: "c'est vous, au clavier (Z Q S D, E)", none: "pas d'humain" });

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
// The indicators of step 0 (26/10, docs/recherche/indicateurs.md) after the first ones: means over the services, maxima included.
const MEASURES = ["orders", "onTime", "late", "missed", "meanServe", "waits", "burnt", "p90Serve", "maxServe", "maxLate", "peakOpen", "servedByHuman", "useBoard", "useStove", "usePass", "useCounter", "waitBoard", "waitStove", "waitPass", "waitCounter"];

/**
 * The robots' rules on the same `services` services of `setup`, with the human `humanName` (or none): each
 * rule's mean measures, and its dishes served in time against the oldest-first rule's, by pairs.
 * @param {object} setup
 * @param {{ services?: number, seed?: number, humanName?: string, rules?: Record<string, Rule> }} [options]
 * @returns {Record<string, Summary>}
 */
export function compareRules(setup, options = {}) {
  const { services, seed, humanName, rules } = { services: 100, seed: 1, humanName: "urgent", rules: RULES, ...options };
  const human = HUMANS[humanName] ?? null;
  const runs = Object.fromEntries(Object.keys(rules).map((name) => [name, []]));
  for (let i = 0; i < services; i += 1) for (const [name, rule] of Object.entries(rules)) runs[name].push(runService(setup, seed + i, rule, human).measures);
  return summaryOf(runs);
}

/** The mean of each measure over `measures` (one rule's services), those the services have. @type {(measures: Measures[]) => Omit<Summary, "gain">} */
const meansOf = (measures) => /** @type {any} */ (Object.fromEntries(MEASURES.filter((key) => key in measures[0]).map((key) => [key, mean(measures.map((one) => one[key]))])));

/**
 * Each rule's services (`{ name: measures[] }`, the same services for all) summed up as `compareRules` does.
 * @param {Record<string, Measures[]>} runs
 * @returns {Record<string, Summary>}
 */
export function summaryOf(runs) {
  const baseline = runs.oldest?.map((one) => one.onTime);
  return Object.fromEntries(Object.entries(runs).map(([name, measures]) => [name, { ...meansOf(measures), gain: baseline ? paired(measures.map((one) => one.onTime), baseline) : null }]));
}
