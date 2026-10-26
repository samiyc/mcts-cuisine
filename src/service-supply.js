import { RECIPES } from "./kitchens.js";

/**
 * The rupture, « le 86 » (Sami, 26/10/2026, step 1 of docs/recherche/feuille-de-route.md; his choice: the orders are
 * refused). Each crate holds a stock for the service (`setup.supply`, by the crate's letter: `{ o: 6, t: 6 }`), off by
 * default. A dish uses its ingredient when a cook takes its order to make from the start (the kitchen knows its
 * stock: nobody walks to an empty crate); a batch made ahead uses one too. The last one gone, the dish is off the
 * menu: its orders still open, and those still to come, are refused (counted apart, neither late nor missed), a soup
 * burnt or a dish dead at the pass to make again included. The search's worlds have their own count.
 */
export const SUPPLY = Object.freeze({ o: 6, t: 6 });

/** The ingredient of `recipe`, the crate's letter. */
const ingredientOf = (recipe) => RECIPES[recipe].ingredient;

/** Is `recipe` off the menu, its crate empty? */
export const isOut = (state, recipe) => Boolean(state.supply) && state.supply[ingredientOf(recipe)] === 0;

/** `order` refused: the dish is off the menu. */
function refuse(state, order) {
  Object.assign(order, { status: "refused", cook: null });
  state.log.push({ t: state.t, type: "refused", order: order.id });
}

/** A dish of `recipe` is started from its crate: one ingredient less; the last one, and its open orders are refused. */
export function useSupply(state, recipe) {
  if (!state.supply) return;
  const ingredient = ingredientOf(recipe);
  state.supply[ingredient] -= 1;
  if (state.supply[ingredient] > 0) return;
  state.log.push({ t: state.t, type: "out", ingredient });
  for (const order of state.upcoming) if (order.status === "open" && !order.stock && ingredientOf(order.recipe) === ingredient) refuse(state, order);
}

/** An order coming in, or going back to open (a soup burnt, a dish dead at the pass): refused when its dish is off the menu. */
export function refuseIfOut(state, order) {
  if (isOut(state, order.recipe) && !order.stock) refuse(state, order);
}

/** The rupture's measures: the orders refused, the turn each crate ran out. */
export function supplyMeasures(state) {
  if (!state.supply) return {};
  const out = Object.fromEntries(state.log.filter((event) => event.type === "out").map((event) => [event.ingredient, event.t]));
  return { refused: state.upcoming.filter((order) => order.status === "refused").length, outAt: out };
}
