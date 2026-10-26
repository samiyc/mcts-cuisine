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

/** The turns of work left on `order` in `state`: a pot's cooking, a cook's steps still to do, or the dish's work. */
function leftOf(state, order) {
  if (order.status === "cooking") return state.pots.get(order.stove).ready - state.t + 1;
  const cook = order.status === "taken" ? state.cooks.find((one) => one.order === order.id) : null;
  if (!cook?.steps) return workOf(order);
  return cook.steps.slice(cook.step).reduce((sum, step) => sum + step.turns, 0);
}

/** How much longer than its own work a dish may wait for its table-mates before it is fired (a hypothesis). */
const HOLD = 4;
const DONE = new Set(["passed", "served", "refused"]);

/**
 * « Faire marcher » (step 1 of the trades' roadmap): a dish is fired when its table-mates still to finish need no more
 * than its own work and `HOLD` turns: it then reaches the pass with them. A soup ready on a stove is always taken off.
 */
function fires(state, order) {
  if (!order.table || order.status === "ready") return true;
  const mates = state.upcoming.filter((one) => one.table === order.table && one !== order && !DONE.has(one.status));
  return mates.every((mate) => leftOf(state, mate) <= workOf(order) + HOLD);
}

/** The older table first; in a table, the longer dish first; then the older order. */
function tableFirst(a, b) {
  const [tableA, tableB] = [a.table ?? a.id, b.table ?? b.id];
  if (tableA !== tableB) return tableA < tableB;
  if (workOf(a) !== workOf(b)) return workOf(a) > workOf(b);
  return a.arrival < b.arrival;
}

/** @type {Readonly<Record<string, Rule>>} */
export const RULES = Object.freeze({
  /** The order that came first. */
  oldest: (open) => first(open, (a, b) => a.arrival < b.arrival),
  /** The quickest dish first, the older between equals: more dishes out, the long ones wait. */
  quickest: (open) => first(open, (a, b) => workOf(a) < workOf(b) || (workOf(a) === workOf(b) && a.arrival < b.arrival)),
  /**
   * The table (Sami, 26/10, the brigade's way): the oldest table, its longest dish first, each dish fired when it will
   * reach the pass with the others; none taken when every dish open waits for its mates. Without tables, the oldest.
   */
  table: (open, context) => {
    const fired = open.filter((order) => fires(context.state, order));
    return fired.length ? first(fired, tableFirst) : undefined;
  },
});
export const RULE_LABELS = Object.freeze({ oldest: "la plus ancienne", quickest: "le plat le plus rapide", table: "la table (faire marcher)", search: "recherche (ISMCTS)" });

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
const MEASURES = ["orders", "onTime", "late", "missed", "meanServe", "waits", "burnt", "p90Serve", "maxServe", "maxLate", "peakOpen", "servedByHuman", "useBoard", "useStove", "usePass", "useCounter", "waitBoard", "waitStove", "waitPass", "waitCounter", "tables", "tablesOnTime", "died", "maxPass"];

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
