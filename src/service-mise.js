import { RECIPES } from "./kitchens.js";
import { PUT, fitsRole, stepsOf } from "./service-basics.js";
import { stationFor } from "./service-legs.js";
import { isOut, useSupply } from "./service-supply.js";

/**
 * The mise en place (Sami, 26/10/2026: postponed in the morning, asked for in the evening; docs/recherche/glossaire.md,
 * `docs/modele.md` « La suite » 3): a free robot with no order to take prepares ahead, as a brigade does before and
 * during the service. It fetches and cuts a dish with no order yet and puts it on a counter (cut onions for a soup, a
 * salad ready to serve), `ahead` batches waiting at most; the next order of that dish takes it over where it stands
 * (`adoptStock`, service-work.js), in the robot's hands if it is not yet put down. `setup.miseEnPlace`, off by
 * default; only where there are counters to put it on. The figures are hypotheses.
 */
export const MISE = Object.freeze({ ahead: 2, dishes: Object.freeze(["soupe"]) });

/** The steps of a batch made ahead: fetch, cut, put it down on a counter. */
const aheadSteps = (recipe) => [...stepsOf(recipe).slice(0, 2), PUT];

/**
 * The dish `cook` would prepare ahead, or null: one its role fits, its crate not empty, a crate, a board and a counter
 * within its reach; the one with the fewest batches waiting, the longest to cut between equals (it saves the most).
 */
function dishFor(state, cook) {
  const batches = (recipe) => state.upcoming.filter((order) => order.stock && order.recipe === recipe).length;
  const { dishes: only } = state.setup.miseEnPlace;
  const fits = (recipe) => (!only || only.includes(recipe)) && fitsRole(cook.role, { status: "open", recipe }) && !isOut(state, recipe);
  const reachable = (recipe) => aheadSteps(recipe).every((step) => stationFor(state, cook, step));
  const dishes = Object.keys(RECIPES).filter((recipe) => fits(recipe) && reachable(recipe));
  dishes.sort((a, b) => batches(a) - batches(b) || RECIPES[b].cut - RECIPES[a].cut);
  return dishes[0] ?? null;
}

/** May `cook` prepare ahead now: the setting on, a robot not at the pass, fewer than `ahead` batches waiting? */
function mayPrepare(state, cook) {
  const mise = state.setup.miseEnPlace;
  if (!mise || cook.kind !== "robot" || cook.role === "passe" || cook.role === "aboyeur") return false;
  return state.upcoming.filter((order) => order.stock).length < mise.ahead;
}

/** A free robot with no order prepares a batch ahead, when it may: true when it set off. */
export function prepareAhead(state, cook) {
  if (!mayPrepare(state, cook)) return false;
  const recipe = dishFor(state, cook);
  if (!recipe) return false;
  state.stocked = (state.stocked ?? 0) + 1;
  const order = { id: -state.stocked, recipe, arrival: Infinity, deadline: Infinity, status: "taken", cook: cook.id, servedAt: null, stock: true, mise: true };
  state.upcoming.push(order);
  useSupply(state, recipe);
  Object.assign(cook, { order: order.id, steps: aheadSteps(recipe), step: 0, phase: "next" });
  state.log.push({ t: state.t, type: "ahead", cook: cook.id, order: order.id });
  return true;
}

/** A batch taken over by `order` while its robot still holds it: past the cutting, it goes on as the order's dish (cook it, serve it) instead of putting it down. */
export function goOn(state, order) {
  const cook = state.cooks.find((one) => one.order === order.id);
  if (!cook?.steps || cook.steps.at(-1).type !== "put" || cook.step >= cook.steps.length - 1) return;
  cook.steps = [...cook.steps.slice(0, -1), ...stepsOf(order.recipe).slice(2)];
}

/** The mise en place's measures: the batches made ahead, those an order took over, those left at the end. */
export function miseMeasures(state) {
  if (!state.setup.miseEnPlace) return {};
  const made = state.log.filter((event) => event.type === "ahead").length;
  const left = state.upcoming.filter((order) => order.mise).length;
  return { ahead: made, aheadUsed: made - left, aheadLeft: left };
}
