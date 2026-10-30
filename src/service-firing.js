import { RECIPES } from "./kitchens.js";
import { passOf } from "./service-tables.js";

/**
 * When a dish should start (split from rules.js, 26/10/2026, for the aboyeur, service-aboyeur.js): its work left,
 * « faire marcher » with its table, and the backward planning's latest start. Read by the rules and by the aboyeur.
 */

/** The work left on an order: cut onions waiting on a counter have only their cooking left, a dish ready to serve (on a stove or a counter) nothing. */
export function workOf(order) {
  const { cut, cook } = RECIPES[order.recipe];
  if (order.status === "ready" || (order.status === "prepped" && (order.cooked || cook === 0))) return 0;
  return order.status === "prepped" ? cook : cut + cook;
}

/** The turns of work left on `order` in `state`: a pot's cooking, a cook's steps still to do, or the dish's work. */
export function leftOf(state, order) {
  if (order.status === "cooking") return state.pots.get(order.stove).ready - state.t + 1;
  const cook = order.status === "taken" ? state.cooks.find((one) => one.order === order.id) : null;
  if (!cook?.steps) return workOf(order);
  return cook.steps.slice(cook.step).reduce((sum, step) => sum + step.turns, 0);
}

/** How much longer than its own work a dish may wait for its table-mates before it is fired (a hypothesis). */
const HOLD = 4;
export const DONE = new Set(["passed", "served", "refused", "gone"]);

/**
 * « Faire marcher » (step 1 of the trades' roadmap): a dish is fired when its table-mates still to finish need no more
 * than its own work and `HOLD` turns: it then reaches the pass with them. A soup ready on a stove is always taken off.
 * Counting the free hands as well (who will make the mates, and when), and calling first for a dish whose mates wait
 * at the pass (the aboyeur's « réclame »), were measured on 26/10 and changed nothing (+0.1 dish in time on average,
 * and about 0; docs/metiers.md): the simpler rule stays.
 */
export function fires(state, order) {
  if (!order.table || order.status === "ready") return true;
  const mates = state.upcoming.filter((one) => one.table === order.table && one !== order && !DONE.has(one.status));
  return mates.every((mate) => leftOf(state, mate) <= workOf(order) + HOLD);
}

/**
 * The table goes out together (Sami, 30/10/2026, to test: the tables whose dishes die at the pass one after the other,
 * docs/recherche/oublis.md): with `setup.tables.together`, a robot starts only the dishes fired, whatever its rule or
 * the search would take, as the table's rule does; the human chooses as he does. Off by default. On 30 services of
 * the brigade's tables, a margin of 5 or 6 turns did better than `HOLD` with the quickest dish and worse in the detour:
 * `HOLD` stays, not tuned.
 */
export function together(state, cook, open) {
  if (cook.kind !== "robot" || !state.setup.tables?.together) return open;
  return open.filter((order) => fires(state, order));
}

/** The turns a dish is assumed to take beyond its work: walking, a station to wait for (a hypothesis). */
const MARGIN = 10;
/** The turn a dish must start by to go out on time: its send turn (a banquet's) or its deadline, less its work and the margin. */
export const latestStart = (order) => (order.sendAt ?? order.deadline) - workOf(order) - MARGIN;
/** Started now, would a banquet's dish wait warm longer than the pass allows? A soup ready on its stove is always taken off. */
export const tooEarly = (state, order) => order.sendAt !== undefined && order.status !== "ready" && state.t < latestStart(order) - (passOf(state.setup)?.pass ?? Infinity);
