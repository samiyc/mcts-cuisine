import { fires, tooEarly } from "./service-firing.js";

/**
 * The aboyeur (Sami, 26/10/2026, step 1 of docs/recherche/feuille-de-route.md; docs/recherche/brigade-service.md): a
 * robot of role `aboyeur` holds the pass, serves what is ready like the pass's robot, and tells the others what to
 * make. While he is in the kitchen, a robot takes only the dishes he has fired (« ça marche » : the dish will reach the
 * pass with its table; at a banquet or for a courier, not before it would wait too long there), and first those he
 * calls for (« la réclame » : its table-mates already wait at the pass, the one waited for the longest first). The
 * human does not obey him: the simulated cooks choose as they do. Without tables, every dish is fired: he only serves.
 */

/** Is there an aboyeur in the kitchen? */
export const hasAboyeur = (state) => state.cooks.some((cook) => cook.role === "aboyeur");

/** The turn the first of `order`'s table-mates came to wait at the pass; Infinity when none waits there. */
function waitingSince(state, order) {
  if (!order.table) return Infinity;
  const waiting = state.upcoming.filter((one) => one.table === order.table && one.status === "passed");
  return waiting.length ? Math.min(...waiting.map((one) => one.passedAt)) : Infinity;
}

/** The aboyeur calls, at the start of a turn: each open dish whose mates wait at the pass is called for (`order.called`, the turn), once, logged. */
export function callForDishes(state) {
  if (!hasAboyeur(state)) return;
  for (const order of state.upcoming) {
    if (order.status !== "open") continue;
    const since = waitingSince(state, order);
    if (since === Infinity) delete order.called;
    else if (order.called === undefined) {
      order.called = since;
      state.log.push({ t: state.t, type: "called", order: order.id });
    }
  }
}

/** Has the aboyeur fired `order`: it will reach the pass with its table, and not too early? A dish ready to serve always is. */
const firedNow = (state, order) => order.status === "ready" || (fires(state, order) && !tooEarly(state, order));

/**
 * What a robot `cook` is told to make among `open`: with an aboyeur (and not being him), the dishes he fired, and only
 * those he calls for when there are some, the one called for the longest first. Otherwise `open` as it is.
 */
export function toldBy(state, cook, open) {
  if (cook.kind !== "robot" || cook.role === "aboyeur" || !hasAboyeur(state)) return open;
  const fired = open.filter((order) => firedNow(state, order));
  const called = fired.filter((order) => order.called !== undefined);
  if (!called.length) return fired;
  const longest = Math.min(...called.map((order) => order.called));
  return called.filter((order) => order.called === longest);
}
