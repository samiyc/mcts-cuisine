import { RECIPES } from "./kitchens.js";
import { FREE, keyOf, orderOf } from "./service-basics.js";
import { drop } from "./service-legs.js";
import { refuseIfOut } from "./service-supply.js";
import { toPass } from "./service-tables.js";

/**
 * The work that ends (split from simulate.js, 26/10/2026): a step done, a dish put down on a counter or a pot put on,
 * the pots that get ready and burn, and the batches made ahead that an order takes over.
 */

/** Cut onions put down on `cook`'s counter: for a robot to cook, the cook free. */
function putDown(state, cook, order, counter) {
  if (state.claims.get(counter) === cook.id) state.claims.delete(counter);
  state.shelf.set(counter, order.id);
  Object.assign(order, { status: "prepped", cook: null, counter });
  state.log.push({ t: state.t, type: "put", cook: cook.id, order: order.id });
  Object.assign(cook, FREE);
}

/** The pot on: the soup cooks alone on `cook`'s stove, the stove clean again, the cook free. */
function putOn(state, cook, order, stove) {
  state.dirty.delete(stove);
  state.pots.set(stove, { order: order.id, ready: state.t + RECIPES[order.recipe].cook, owner: cook.id });
  Object.assign(order, { status: "cooking", cook: null, stove });
  state.log.push({ t: state.t, type: "pot", cook: cook.id, order: order.id });
  Object.assign(cook, FREE);
}

/** A soup left `burn` turns past ready burns: the stove to clean, the dish lost, the order to make again. */
function burn(state, stove, order) {
  const cook = state.cooks.find((one) => one.order === order.id);
  if (cook) drop(state, cook);
  state.pots.delete(stove);
  state.dirty.add(stove);
  state.burnt += 1;
  // A soup made ahead is simply lost; an order's is to make again.
  if (order.stock) state.upcoming.splice(state.upcoming.indexOf(order), 1);
  Object.assign(order, { status: "open", cook: null, stove: null, burnt: (order.burnt ?? 0) + 1 });
  refuseIfOut(state, order);
  state.log.push({ t: state.t, type: "burnt", order: order.id });
}

/** The pots: a soup done is ready; one left `burn` turns past ready burns (unless a cook is taking it up), the order to make again. */
export function watchPots(state) {
  for (const [stove, pot] of state.pots) {
    const order = state.upcoming.find((one) => one.id === pot.order);
    if (order.status === "cooking" && state.t >= pot.ready) order.status = "ready";
    if (state.t < pot.ready + state.setup.unattended.burn) continue;
    const taking = state.cooks.find((one) => one.order === order.id)?.phase === "working";
    if (!taking) burn(state, stove, order);
  }
}

/** What each kind of step does as it ends; true when the cook is done with its dish (it is free again). */
const ENDS = Object.freeze({
  clean: (state, cook, _order, stove) => {
    state.dirty.delete(stove);
    state.log.push({ t: state.t, type: "cleaned", cook: cook.id });
    Object.assign(cook, FREE);
    return true;
  },
  put: (state, cook, order, counter) => {
    putDown(state, cook, order, counter);
    return true;
  },
  cook: (state, cook, order, stove) => {
    if (state.setup.unattended) {
      putOn(state, cook, order, stove);
      return true;
    }
    order.cooked = true;
    return false;
  },
  collect: (state, _cook, order, stove) => {
    state.pots.delete(stove);
    Object.assign(order, { stove: null, cooked: true });
    return false;
  },
  pickup: (state, _cook, order, counter) => {
    state.shelf.delete(counter);
    order.counter = null;
    return false;
  },
});

/** `cook`'s work ends now: the next step, or the dish served after its last. */
function finish(state, cook) {
  const order = orderOf(state, cook);
  const step = cook.steps[cook.step];
  const station = cook.station && keyOf(cook.station);
  if (cook.station && state.claims.get(station) === cook.id) state.claims.delete(station);
  Object.assign(cook, { until: null, station: null, step: cook.step + 1, phase: "next" });
  if (ENDS[step.type]?.(state, cook, order, station) || cook.step < cook.steps.length) return;
  handOver(state, cook, order);
}

/** The dish done: served, or, with tables (service-tables.js), at the pass to wait for its table. */
function handOver(state, cook, order) {
  if (state.setup.tables && order.table) return toPass(state, cook, order);
  Object.assign(order, { status: "served", servedAt: state.t });
  state.log.push({ t: state.t, type: "served", cook: cook.id, order: order.id });
  Object.assign(cook, FREE);
}

/** Work that ends now: the next step, a dish put down or picked up, a pot put on or taken up, or the dish served. */
export function finishWork(state) {
  for (const cook of state.cooks) if (cook.until === state.t) finish(state, cook);
}

/** What held batch `from` (a cook's hands, a counter, a pot) holds order `to` now. */
function renumber(state, from, to) {
  for (const cook of state.cooks) if (cook.order === from) cook.order = to;
  for (const [key, id] of state.shelf) if (id === from) state.shelf.set(key, to);
  for (const pot of state.pots.values()) if (pot.order === from) pot.order = to;
}

/** `order` takes over the batch `stock` where it stands (in the chef's hands, on a counter, on a stove), and the batch is gone. */
function adopt(state, stock, order) {
  Object.assign(order, { status: stock.status, cook: stock.cook, counter: stock.counter ?? null, stove: stock.stove ?? null, cooked: stock.cooked ?? false });
  renumber(state, stock.id, order.id);
  state.upcoming.splice(state.upcoming.indexOf(stock), 1);
  state.log.push({ t: state.t, type: "adopted", order: order.id });
}

/** Batches made ahead: the oldest open order of the same dish takes each over. */
export function adoptStock(state) {
  for (const stock of state.upcoming.filter((order) => order.stock)) {
    const order = state.upcoming.filter((one) => !one.stock && one.status === "open" && one.recipe === stock.recipe).sort((a, b) => a.arrival - b.arrival)[0];
    if (order) adopt(state, stock, order);
  }
}
