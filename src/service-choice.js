import { distancesFrom } from "./kitchen.js";
import { RECIPES } from "./kitchens.js";
import { PILE, fitsRole, keyOf, kindDistance, placeOf, servable, sideDistance, stepsFrom, stoveFree } from "./service-basics.js";
import { toldBy } from "./service-aboyeur.js";
import { formBatch } from "./service-batch.js";
import { paceOf, stepAside, watch } from "./service-legs.js";
import { useSupply } from "./service-supply.js";

/**
 * What a free cook may take, and taking it (split from simulate.js, 26/10/2026): the orders it is offered by its
 * role and its reach, and what a rule or the human is asked.
 */

/** A dish in the making somewhere (in a cook's hands once fetched, on a counter, on a stove): the pass's robot waits for it. */
const dishOnItsWay = (state, cook) => state.pots.size > 0 || state.shelf.size > 0 || state.cooks.some((other) => other !== cook && other.order && other.step > 0);

/**
 * A cooking robot watches the stoves while a pot is on, the pass's robot the pass while a dish is on its way: they help
 * elsewhere only when there is nothing to watch. The aboyeur never leaves the pass (service-aboyeur.js), the dish room's
 * robot the sink (service-plates.js).
 */
const watching = (state, cook) => cook.role === "aboyeur" || cook.role === "plonge" || (cook.role === "cuisson" && state.pots.size > 0) || (cook.role === "passe" && dishOnItsWay(state, cook));

/**
 * A soup ready on a stove: only if the cook gets there before it burns; the keyboard chef's own, left to him
 * until it is about to burn (Sami, 23/10: a robot set off for it and arrived too late).
 */
function inTime(state, cook, order, walk) {
  if (order.status !== "ready" || !state.setup.unattended) return true;
  const pot = state.pots.get(order.stove);
  const left = pot.ready + state.setup.unattended.burn - state.t;
  const owner = state.cooks.find((one) => one.id === pot.owner);
  return walk(order) + 1 <= left && (!owner?.manual || owner === cook || left <= walk(order) + 3);
}

/**
 * What a free cook is asked: the open orders, the soups ready on a stove (and, for a robot, the cut onions
 * waiting on a counter), and `reach(order)`, the floor distance to its ingredient's crate, to the counter or
 * to the stove. A robot with a role is offered the work of its role, everything when there is none.
 */
export function choiceOf(state, cook) {
  // Cut onions are offered only while a stove is free: taken up with every stove holding a pot, they would wait in hand.
  const cookable = !state.setup.unattended || stoveFree(state);
  const offered = (order) => !order.stock && (order.status === "open" || order.status === "ready" || (cook.kind === "robot" && order.status === "prepped" && (cookable || servable(order))));
  const distances = distancesFrom(state.kitchen, cook);
  const distanceTo = (station) => sideDistance(distances, station);
  const reach = (order) => Math.min(...state.kitchen.stations.filter((station) => (placeOf(order) ? keyOf(station) === placeOf(order) : station.kind === RECIPES[order.recipe].ingredient)).map(distanceTo));
  // Only what this cook can reach (a kitchen cut in two); a dish on a counter, only if it can also reach what it
  // needs next (taking up the dish it has just left for someone else would loop).
  // The turns to get there: the cells over the pace (service-legs.js).
  const walk = (order) => Math.ceil(reach(order) / paceOf(state));
  const nextKind = (order) => (servable(order) ? "S" : "P");
  const all = state.upcoming.filter((order) => offered(order) && reach(order) < Infinity && (order.status !== "prepped" || (order.relayedBy !== cook.id && kindDistance(state, distances, nextKind(order)) < Infinity)) && inTime(state, cook, order, walk));
  // Cut onions piling up on the counters (two or more): the stove is behind, any robot gives a hand.
  const pile = all.filter((order) => order.status === "prepped");
  const mine = all.filter((order) => fitsRole(cook.role, order) || (pile.length >= PILE && order.status === "prepped"));
  // With an aboyeur, a robot makes what he fired and calls for (service-aboyeur.js).
  const open = toldBy(state, cook, mine.length > 0 || watching(state, cook) ? mine : all);
  // A cook whose pot is on keeps an eye on it: a soup to take off, or an order it cuts before its own is ready.
  const own = [...state.pots.values()].find((pot) => pot.owner === cook.id && state.t < pot.ready);
  if (own) return { cook, open: open.filter((order) => order.status === "ready" || (order.status === "open" && walk(order) + 1 + RECIPES[order.recipe].cut + 2 <= own.ready - state.t)), reach };
  return { cook, open, reach };
}

/** `choice.cook` takes order `id`, or, with none, goes back to its place or out of the way. */
export function take(state, choice, id) {
  const chosen = choice.open.find((order) => order.id === id);
  const { cook } = choice;
  if (!chosen) {
    if (!state.setup.unattended || !watch(state, cook)) stepAside(state, cook);
    return;
  }
  // At a banquet, with the dishes of its batch (service-batch.js).
  const steps = formBatch(state, cook, chosen, stepsFrom(chosen));
  Object.assign(chosen, { status: "taken", cook: cook.id });
  if (steps[0].type === "fetch") useSupply(state, chosen.recipe);
  Object.assign(cook, { order: chosen.id, steps, step: 0, phase: "next" });
  state.log.push({ t: state.t, type: "taken", cook: cook.id, order: chosen.id });
}

/** What a rule or the human is given: the open orders and `{ t, reach, rng, state }` (only the search reads `state`). */
export const ask = (state, choice, rule) => (choice.open.length ? rule(choice.open, { t: state.t, reach: choice.reach, rng: state.rng, state })?.id : null);
