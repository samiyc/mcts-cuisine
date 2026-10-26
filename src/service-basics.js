import { RECIPES } from "./kitchens.js";

/**
 * The words of a service every part of it shares (split from simulate.js, 26/10/2026): the cells' keys, a dish's
 * steps from where it stands, which role an order belongs to, and the floor distances to a station.
 */
export const keyOf = (cell) => `${cell.x},${cell.y}`;
/** A station only one cook works at a time: a board, a stove, a counter, a packing station. */
export const isWorkStation = (kind) => kind === "C" || kind === "P" || kind === "_" || kind === "E";
/** Cut onions waiting on the counters from which any robot helps cook them. */
export const PILE = 2;
/** Putting cut onions down on a counter. */
export const PUT = Object.freeze({ type: "put", kind: "_", turns: 1 });
/** A dish on a counter that only needs serving: a salad cut, a soup cooked. */
export const servable = (order) => Boolean(order.cooked) || RECIPES[order.recipe].cook === 0;
/** A cook back to free, its hands empty. */
export const FREE = Object.freeze({ order: null, steps: null, step: 0, phase: "idle" });

/** The steps of a dish: `{ type, kind, turns }`, kind a station's letter. */
export function stepsOf(recipe) {
  const { ingredient, cut, cook } = RECIPES[recipe];
  return [{ type: "fetch", kind: ingredient, turns: 1 }, { type: "cut", kind: "C", turns: cut }, ...(cook > 0 ? [{ type: "cook", kind: "P", turns: cook }] : []), { type: "serve", kind: "S", turns: 1 }];
}

/** A dish waiting on counter `at` ("x,y"): pick it up there, cook it when it is not yet, serve it. */
export const pickupSteps = (at, recipe, cooked = false) => [{ type: "pickup", kind: "_", at, turns: 1 }, ...stepsOf(recipe).filter((step) => (step.type === "cook" && !cooked) || step.type === "serve")];
/** A soup ready on stove `at` ("x,y"): take it up there, serve it. */
export const collectSteps = (at) => [{ type: "collect", kind: "P", at, turns: 1 }, { type: "serve", kind: "S", turns: 1 }];

/** The steps from where `order` stands: on a counter, ready on a stove, or from the start. */
export function stepsFrom(order) {
  if (order.status === "prepped") return pickupSteps(order.counter, order.recipe, order.cooked);
  if (order.status === "ready") return collectSteps(order.stove);
  return stepsOf(order.recipe);
}

/** Where an order waits for its next cook: the counter it is on, the stove it is ready on, or nowhere. */
export function placeOf(order) {
  if (order.status === "prepped") return order.counter;
  if (order.status === "ready") return order.stove;
  return null;
}

/** What each role takes among the orders not ready to serve. The pass's robot and the aboyeur take only what is ready. */
const ROLE_FITS = Object.freeze({
  coupe: (order, cooked) => order.status === "open" && cooked,
  cuisson: (order) => order.status === "prepped",
  salade: (order, cooked) => order.status === "open" && !cooked,
  passe: () => false,
  aboyeur: () => false,
});

/** Does order `order` (open, prepped on a counter, ready on a stove) belong to role `role`? Any order for no role; a ready soup for everyone, before it burns. */
export function fitsRole(role, order) {
  // Ready to serve, on a stove or a counter: for everyone.
  if (order.status === "ready" || (order.status === "prepped" && servable(order))) return true;
  const fits = ROLE_FITS[role];
  return fits ? fits(order, RECIPES[order.recipe].cook > 0) : true;
}

export const orderOf = (state, cook) => state.upcoming.find((order) => order.id === cook.order);

/** The floor distance from `distances` (a BFS map) to the nearest side of `station`, Infinity when out of reach. */
export const sideDistance = (distances, station) => Math.min(...station.access.map((cell) => distances.get(keyOf(cell)) ?? Infinity));
/** The floor distance from `distances` to the nearest station of `kind`. */
export const kindDistance = (state, distances, kind) => Math.min(...state.kitchen.stations.filter((station) => station.kind === kind).map((station) => sideDistance(distances, station)));
/** Is a stove free (no pot, nobody cooking there)? */
export const stoveFree = (state) => state.kitchen.stations.some((station) => station.kind === "P" && !state.claims.has(keyOf(station)) && !state.pots.has(keyOf(station)));
/** Is `cook` standing on `cell`? */
export const standsOn = (cook, cell) => cook.x === cell.x && cook.y === cell.y;
