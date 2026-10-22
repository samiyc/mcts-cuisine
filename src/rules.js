import { paired } from "mcts-commun/measure.js";
import { RECIPES } from "./kitchens.js";
import { runService } from "./simulate.js";

/**
 * Who takes which order. A rule (for the robots) and a human model are both `(open, { t, reach, rng }) =>
 * order`: `open` the orders nobody has taken, `reach(order)` the floor distance to its ingredient's crate.
 */
const first = (open, before) => open.reduce((best, order) => (before(order, best) ? order : best));
const workOf = (order) => RECIPES[order.recipe].cut + RECIPES[order.recipe].cook;

export const RULES = Object.freeze({
  /** The order that came first. */
  oldest: (open) => first(open, (a, b) => a.arrival < b.arrival),
  /** The quickest dish first, the older between equals: more dishes out, the long ones wait. */
  quickest: (open) => first(open, (a, b) => workOf(a) < workOf(b) || (workOf(a) === workOf(b) && a.arrival < b.arrival)),
});
export const RULE_LABELS = Object.freeze({ oldest: "la plus ancienne", quickest: "le plat le plus rapide" });

/** Three simulated humans (docs: the human's model is the heart of the project; start with three). */
export const HUMANS = Object.freeze({
  nearest: (open, { reach }) => first(open, (a, b) => reach(a) < reach(b)),
  urgent: (open) => first(open, (a, b) => a.deadline < b.deadline),
  random: (open, { rng }) => open[rng.int(open.length)],
});
export const HUMAN_LABELS = Object.freeze({ nearest: "prend le plus proche", urgent: "prend le plus urgent", random: "prend au hasard", none: "pas d'humain" });

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const MEASURES = ["orders", "onTime", "late", "missed", "meanServe", "waits"];

/**
 * The robots' rules on the same `services` services of `setup`, with the human `humanName` (or none): each
 * rule's mean measures, and its dishes served in time against the oldest-first rule's, by pairs.
 */
export function compareRules(setup, { services = 100, seed = 1, humanName = "urgent", rules = RULES } = {}) {
  const human = HUMANS[humanName] ?? null;
  const runs = Object.fromEntries(Object.keys(rules).map((name) => [name, []]));
  for (let i = 0; i < services; i += 1) for (const [name, rule] of Object.entries(rules)) runs[name].push(runService(setup, seed + i, rule, human, humanName).measures);
  const baseline = runs.oldest?.map((one) => one.onTime);
  return Object.fromEntries(Object.entries(runs).map(([name, measures]) => [name, { ...Object.fromEntries(MEASURES.map((key) => [key, mean(measures.map((one) => one[key]))])), gain: baseline ? paired(measures.map((one) => one.onTime), baseline) : null }]));
}
