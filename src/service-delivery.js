import { createRng } from "mcts-commun/random.js";
import { drop } from "./service-legs.js";

/**
 * Delivery, the dark kitchen (Sami, 26/10/2026, step 3 of docs/recherche/feuille-de-route.md;
 * docs/recherche/livraison.md). Each order has its courier: the platform announces when he will come (`sendAt`,
 * `prep` turns after the order), known to every cook; he really comes at `courierAt`, drawn up to `spread` turns
 * either way, which nobody knows before he is there. A dish made waits at the pass for its courier, `pass` turns at
 * most (it goes cold, it is made again); the courier waits for his dish `wait` turns at most, then leaves without it
 * (the order « gone »). It is the tables' machinery (service-tables.js): an order is a table of one, sent when its
 * courier is there. The search draws again, in each of its worlds, when the couriers not yet come will come.
 * `setup.delivery`, off by default; the figures are hypotheses, not sources. The packing station is left for later
 * (docs/recherche/oublis.md).
 */
export const DELIVERY = Object.freeze({ prep: 30, spread: 8, wait: 10, pass: 15 });
/** Packing a dish, in turns, in a kitchen with a packing station (a hypothesis: about a minute, docs/recherche/production.md). */
export const PACKING = 2;

/** When a courier announced at `announced` really comes, drawn by `rng`. */
const courierOf = (delivery, rng, announced) => announced - delivery.spread + rng.int(2 * delivery.spread + 1);

/** `order` with its courier: announced, really coming, and its deadline (the courier gone). */
export function withCourier(order, delivery, rng) {
  const sendAt = order.arrival + delivery.prep;
  const courierAt = courierOf(delivery, rng, sendAt);
  return { ...order, table: order.id, sendAt, courierAt, deadline: courierAt + delivery.wait };
}

/** The service's orders with their couriers, drawn from their own stream: the orders themselves as without delivery. */
export const deliveryOrders = (orders, setup, seed) => {
  const rng = createRng(seed + 101);
  return orders.map((order) => withCourier(order, setup.delivery, rng));
};

/** In a world of the search: the couriers not yet come drawn again around their announced turn. */
export function redrawCouriers(world, rng) {
  if (!world.setup.delivery) return;
  for (const order of world.upcoming) {
    if (order.courierAt === undefined || order.courierAt <= world.t) continue;
    const courierAt = Math.max(world.t + 1, courierOf(world.setup.delivery, rng, order.sendAt));
    Object.assign(order, { courierAt, deadline: courierAt + world.setup.delivery.wait });
  }
}

/**
 * Whatever still holds `order`, given up: the cook making it (free again, its station let go), its pot on a stove, its
 * dish on a counter. Without it, a cook went on with a dish whose courier had left, and sent it to nobody.
 */
function abandon(state, order) {
  const cook = state.cooks.find((one) => one.order === order.id);
  if (cook) letCookGo(state, cook);
  for (const [stove, pot] of state.pots) if (pot.order === order.id) state.pots.delete(stove);
  for (const [counter, id] of state.shelf) if (id === order.id) state.shelf.delete(counter);
}

/** `cook`'s dish is gone: the stations it claimed let go, the cook free where it stands. */
function letCookGo(state, cook) {
  for (const [key, id] of state.claims) if (id === cook.id) state.claims.delete(key);
  drop(state, cook);
}

/** A courier who waited his `wait` turns leaves without his dish: the order is gone, and what was being made of it. */
export function couriersLeave(state) {
  if (!state.setup.delivery) return;
  for (const order of state.upcoming) {
    if (order.courierAt === undefined || state.t <= order.deadline || ["served", "gone", "refused"].includes(order.status)) continue;
    abandon(state, order);
    Object.assign(order, { status: "gone", cook: null, stove: null, counter: null });
    state.log.push({ t: state.t, type: "gone", order: order.id });
  }
}

/** Delivery's measures: the orders gone without their dish, how long couriers waited for a dish, how long dishes waited for a courier. */
export function deliveryMeasures(state) {
  if (!state.setup.delivery) return {};
  const sent = state.upcoming.filter((order) => order.status === "served" && order.courierAt !== undefined);
  const courierWaits = sent.map((order) => order.servedAt - order.courierAt);
  const passed = new Map(state.log.filter((event) => event.type === "passed").map((event) => [event.order, event.t]));
  const dishWaits = sent.map((order) => order.servedAt - (passed.get(order.id) ?? order.servedAt));
  const mean = (values) => (values.length ? values.reduce((sum, one) => sum + one, 0) / values.length : 0);
  return { gone: state.upcoming.filter((order) => order.status === "gone").length, meanCourierWait: mean(courierWaits), maxCourierWait: Math.max(0, ...courierWaits), maxDishWait: Math.max(0, ...dishWaits) };
}

/**
 * The packing station (Sami, 26/10/2026, the evening, step 3; docs/recherche/production.md): with
 * `setup.delivery.packing` turns and a station `E` in the plan, a delivered dish is packed there before it goes to the
 * pass. Before its serving step, the cook gets a packing step, once (`order.packed`).
 */
export function packFirst(state, cook) {
  const turns = state.setup.delivery?.packing;
  if (!turns || cook.steps?.[cook.step]?.type !== "serve" || !needsPacking(state, cook)) return;
  cook.steps = [...cook.steps.slice(0, cook.step), { type: "pack", kind: "E", turns }, ...cook.steps.slice(cook.step)];
}

/** Is `cook`'s dish a delivered one not yet packed, in a kitchen with a packing station? */
function needsPacking(state, cook) {
  const order = state.upcoming.find((one) => one.id === cook.order);
  return Boolean(order) && !order.packed && order.courierAt !== undefined && state.kitchen.stations.some((station) => station.kind === "E");
}
