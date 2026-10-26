import { createRng } from "mcts-commun/random.js";
import { RECIPES } from "./kitchens.js";
import { keyOf } from "./service-basics.js";

/**
 * Hygiene and allergens (Sami, 26/10/2026, the evening; docs/recherche/production.md): a board remembers the last
 * ingredient cut on it. A share of the salads are for a guest allergic to onions (« sans oignon », `order.allergen`):
 * cut on a board that last cut onions, it must be cleaned first (`clean` turns), as an allergen's cross-contact asks.
 * The cleaning round (« le ménage »): a board is cleaned too every `every` cuts (0: never). A cook prefers a board he
 * need not clean. `setup.hygiene`, off by default; the figures are hypotheses (questions-specialiste.md, 18-20).
 */
export const HYGIENE = Object.freeze({ share: 0.1, clean: 3, every: 0 });

/** The ingredient an allergic guest's dish must not touch: onions. */
const ALLERGEN = "o";

/** Flags a share of the salads « sans oignon », drawn by `rng` (a draw of its own: the orders themselves unchanged). */
export function allergic(orders, hygiene, rng) {
  return orders.map((order) => (RECIPES[order.recipe].ingredient !== ALLERGEN && rng.next() < hygiene.share ? { ...order, allergen: ALLERGEN } : order));
}

/** The service's orders with their allergic guests, from `seed`. */
export const withAllergens = (orders, setup, seed) => (setup.hygiene ? allergic(orders, setup.hygiene, createRng(seed + 307)) : orders);

/** The boards' memory, empty; null without the setting. */
export const boardsOf = (setup) => (setup.hygiene ? new Map() : null);

/** The order `cook` holds. */
const heldBy = (state, cook) => state.upcoming.find((order) => order.id === cook?.order);

/** Does `board` need cleaning before `cook` cuts on it: an allergic guest's dish after onions, or the cleaning round due? */
function mustClean(state, board, cook) {
  const memory = state.boards?.get(keyOf(board));
  if (!memory) return false;
  const { every } = state.setup.hygiene;
  const order = heldBy(state, cook);
  return (Boolean(order?.allergen) && memory.last === order.allergen) || (every > 0 && memory.cuts >= every);
}

/** The turns of cleaning before `cook` cuts on `board`: 0 when it need not be cleaned. */
export const boardCleaning = (state, board, cook) => (mustClean(state, board, cook) ? state.setup.hygiene.clean : 0);

/** `cook` starts cutting on `board`: cleaned first if it must be (counted), then it remembers his ingredient. */
export function useBoard(state, board, cook) {
  if (!state.boards) return;
  const key = keyOf(board);
  const cleaned = mustClean(state, board, cook);
  const memory = state.boards.get(key) ?? { last: null, cuts: 0, cleaned: 0 };
  const order = heldBy(state, cook);
  state.boards.set(key, cleaned ? { last: ingredientOf(order), cuts: 1, cleaned: memory.cleaned + 1 } : { ...memory, last: ingredientOf(order), cuts: memory.cuts + 1 });
  if (cleaned) state.log.push({ t: state.t, type: "board", cook: cook.id, order: order.id });
}

/** The ingredient `order` is cut from. */
const ingredientOf = (order) => RECIPES[order.recipe].ingredient;

/** Their copy for a world of the search. */
export const cloneBoards = (boards) => boards && new Map([...boards].map(([key, memory]) => [key, { ...memory }]));

/** Hygiene's measures: the allergic guests' dishes, the boards cleaned. */
export function hygieneMeasures(state) {
  if (!state.boards) return {};
  const allergic = state.upcoming.filter((order) => order.allergen && order.arrival <= state.t).length;
  const cleaned = [...state.boards.values()].reduce((sum, memory) => sum + memory.cleaned, 0);
  return { allergenOrders: allergic, boardsCleaned: cleaned };
}
