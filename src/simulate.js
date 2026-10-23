import { astar, createReservations } from "mcts-commun/grid.js";
import { createRng } from "mcts-commun/random.js";
import { distancesFrom, readKitchen } from "./kitchen.js";
import { RECIPES } from "./kitchens.js";

/**
 * A service in the kitchen, turn by turn. Orders come during the service, each a dish with a deadline. A free
 * cook (a robot, or the human) takes an order and makes it through: fetch the ingredient at its crate, cut it
 * on a board, cook it on a stove when the recipe says so, serve it at the pass. A board or a stove serves one
 * cook at a time: a cook claims one before walking to it, and waits for one when all are taken. Paths are
 * reserved in space and time around the others (A* of mcts-commun), as in the warehouse.
 *
 * The robots choose their orders with a rule; the human with a model of a human (`HUMANS`): the nearest
 * dish, the most urgent, or any. The robots see an order the human took once he has taken it.
 *
 * **Counters and roles** (`_`, Sami 23/10/2026): a counter holds cut onions waiting for a stove, one batch a
 * counter. A robot may have a role (`setup.roles`, one a robot): `coupe` fetches and cuts the onions of a
 * soup, then puts them on a free counter (or cooks them itself when none is free); `cuisson` takes cut onions
 * from a counter (status "prepped"), cooks and serves them; `salade` makes the salads. A robot is offered the
 * work of its role first, and helps with anything else only when there is none, or with the cooking when two
 * batches or more wait on the counters. A robot without a role, and
 * the human, make whole dishes. A kitchen without roles plays as before; its counters stay empty.
 *
 * **Waiting** (Sami, 23/10): a cook whose station is taken waits on the free floor cell nearest it, off every
 * station's side, instead of walking back to its place with the dish in hand.
 *
 * **The chef at the keyboard** (Sami, 23/10, `manual`): the human is played by a person. `steer` moves him one
 * cell for the coming turn (the robots whose reserved path crosses his new cell plan again: they adapt to
 * him); `interact` works the station beside him: an ingredient at its crate (it takes the oldest open order
 * of that dish, so the robots leave it), the board, the stove, a counter (cut onions put down, or taken up),
 * the pass. He makes no choice of his own between turns.
 *
 * **Unattended cooking** (Sami, 23/10, `setup.unattended`: `{ burn, clean }`): the cook puts the pot on the
 * stove (one turn) and leaves; the soup cooks alone (status "cooking", the stove kept), then waits ready on it
 * ("ready", offered to every cook, whatever its role) for someone to take it up and serve it. Left `burn`
 * turns past ready, it burns: the dish is lost, the order goes back to "open" to be made again, and the stove
 * must be cleaned, `clean` turns more for the next cook who cooks on it. A `cuisson` robot watches the stoves:
 * while a pot is on, it helps nowhere else; any cook whose own pot is on takes only a soup to take off or an
 * order it can cut before its pot is ready. Cut onions are not taken up while every stove holds a pot, and a cook
 * who waits for a stove with them in hand, a soup ready on one, puts them on a free counter to take it off. Without it, a cook stays at the
 * stove while the soup cooks, as before.
 *
 * **Counters as relays** (Sami, 23/10, late evening): anything in hand once cut (onions, a salad, a cooked soup)
 * may wait on a counter for another cook, with what it still needs (status "prepped": cooking, or only serving
 * when `cooked` or a salad). A cook puts it down when the next station is out of its reach (a kitchen cut in
 * two: someone on the other side takes it up), or, for a robot, when a free robot would finish it sooner (a long
 * way from the stoves to the pass; the simulated human does it too; a `passe` robot, which only serves what is ready and waits near the pass while
 * a dish is on its way, is handed every dish to serve that it would bring there sooner). The counters are the kitchen's board of requests: "commande 12, à cuire"
 * there, "je prends" when a cook comes for it. Every cook is offered only what it can reach.
 *
 * **Ahead of the orders** (Sami, same evening): the chef at the keyboard may take an ingredient with no order
 * open, cut it, cook it, put it on a counter: a batch made ahead (`stock`, no arrival, never served as it is).
 * The next order of that dish takes it over where it stands. **E at a burnt stove** cleans it.
 */
const LEG_HORIZON = 80;

/** The service's orders, drawn from a seed: `{ id, recipe, arrival, deadline }`, by arrival. */
export function drawOrders(seed, setup) {
  const rng = createRng(seed);
  const orders = [];
  const names = Object.keys(RECIPES);
  for (let at = 1 + rng.int(3); at <= setup.lastOrder; at += Math.max(1, Math.round(-setup.every * Math.log(1 - rng.next())))) {
    orders.push({ id: orders.length + 1, recipe: names[rng.int(names.length)], arrival: at, deadline: at + setup.patience });
  }
  return orders;
}

/** The steps of a dish: `{ type, kind, turns }`, kind a station's letter. */
export function stepsOf(recipe) {
  const { ingredient, cut, cook } = RECIPES[recipe];
  return [{ type: "fetch", kind: ingredient, turns: 1 }, { type: "cut", kind: "C", turns: cut }, ...(cook > 0 ? [{ type: "cook", kind: "P", turns: cook }] : []), { type: "serve", kind: "S", turns: 1 }];
}

/**
 * The start of a service: cooks at their places, no order yet. `human` names the human's model, or null for
 * none; `seed` draws the random human's choices and the cooks' giving way.
 */
export function createService(setup, orders, { human = "urgent", seed = 1, manual = false } = {}) {
  const kitchen = readKitchen(setup.text);
  const cook = (id, kind, at, role = null) => ({ id, kind, role, x: at.x, y: at.y, home: at, order: null, steps: null, step: 0, phase: "idle", station: null, target: null, path: null, until: null, moves: 0, waits: 0, stalled: 0 });
  const cooks = kitchen.robots.map((at, i) => cook(i + 1, "robot", at, setup.roles?.[i] || null));
  if (human || manual) cooks.push({ ...cook(cooks.length + 1, "human", kitchen.human), manual });
  const reservations = createReservations();
  // Every cook holds its place from the start: nobody plans through a cook standing still.
  for (const one of cooks) reservations.reserve(one.id, [{ x: one.x, y: one.y, t: 0 }], { stay: true });
  return { kitchen, setup, human, rng: createRng(seed + 7_919), t: 0, cooks, upcoming: orders.map((order) => ({ ...order, status: "upcoming", cook: null, servedAt: null })), claims: new Map(), shelf: new Map(), pots: new Map(), dirty: new Set(), burnt: 0, reservations, log: [], cursor: null };
}

const isWorkStation = (kind) => kind === "C" || kind === "P" || kind === "_";
const keyOf = (cell) => `${cell.x},${cell.y}`;
/** Cut onions waiting on the counters from which any robot helps cook them. */
const PILE = 2;
/** Putting cut onions down on a counter. */
const PUT = Object.freeze({ type: "put", kind: "_", turns: 1 });
/** A dish on a counter that only needs serving: a salad cut, a soup cooked. */
const servable = (order) => Boolean(order.cooked) || RECIPES[order.recipe].cook === 0;
/** A dish waiting on counter `at` ("x,y"): pick it up there, cook it when it is not yet, serve it. */
const pickupSteps = (at, recipe, cooked = false) => [{ type: "pickup", kind: "_", at, turns: 1 }, ...stepsOf(recipe).filter((step) => (step.type === "cook" && !cooked) || step.type === "serve")];
/** A soup ready on stove `at` ("x,y"): take it up there, serve it. */
const collectSteps = (at) => [{ type: "collect", kind: "P", at, turns: 1 }, { type: "serve", kind: "S", turns: 1 }];
/** The steps from where `order` stands: on a counter, ready on a stove, or from the start. */
const stepsFrom = (order) => (order.status === "prepped" ? pickupSteps(order.counter, order.recipe, order.cooked) : order.status === "ready" ? collectSteps(order.stove) : stepsOf(order.recipe));
/** Does order `order` (open, prepped on a counter, ready on a stove) belong to role `role`? Any order for no role; a ready soup for everyone, before it burns. */
export function fitsRole(role, order) {
  const cooked = RECIPES[order.recipe].cook > 0;
  // Ready to serve, on a stove or a counter: for everyone.
  if (order.status === "ready" || (order.status === "prepped" && servable(order))) return true;
  if (role === "coupe") return order.status === "open" && cooked;
  if (role === "cuisson") return order.status === "prepped";
  if (role === "salade") return order.status === "open" && !cooked;
  // The pass's robot: only what is ready to serve (handled above).
  if (role === "passe") return false;
  return true;
}
const orderOf = (state, cook) => state.upcoming.find((order) => order.id === cook.order);

/** Plans `cook`'s leg to `target` and reserves it, its last cell kept; false when no path is found. */
function planLeg(state, cook, target) {
  const path = astar(state.kitchen.plan, cook, target, { passable: state.kitchen.floor, reservations: state.reservations, unit: cook.id, start: state.t, horizon: LEG_HORIZON, park: true });
  if (!path) return false;
  state.reservations.release(cook.id);
  state.reservations.reserve(cook.id, path, { stay: true });
  Object.assign(cook, { path, target });
  return true;
}

/** The cells other cooks stand on or walk to: a station's side taken there is taken. */
function takenCells(state, cook) {
  return new Set(state.cooks.filter((other) => other !== cook).flatMap((other) => [keyOf(other), ...(other.target ? [keyOf(other.target)] : [])]));
}

/** Is `station` of no use to `step`: another kind, taken, or holding a dish (a counter) or a pot (a stove), or not the dish's own? */
function unfit(state, station, step) {
  if (station.kind !== step.kind) return true;
  const key = keyOf(station);
  // A relay's counter, chosen and claimed: it must still be empty.
  if (step.at) return key !== step.at || (step.type === "put" && state.shelf.has(key));
  return isWorkStation(step.kind) && (state.claims.has(key) || state.shelf.has(key) || state.pots.has(key));
}

/** How long `step` takes at `station`: putting a pot on is one turn when it cooks alone, the cleaning first on a burnt stove. */
function turnsOf(state, step, station) {
  const { unattended } = state.setup;
  if (step.type !== "cook" || !unattended) return step.turns;
  return 1 + (state.dirty.has(keyOf(station)) ? unattended.clean : 0);
}

/** The station for `cook`'s `step`, and the cell to work it from: the nearest free one, or null. */
function stationFor(state, cook, step) {
  const distances = distancesFrom(state.kitchen, cook);
  const taken = takenCells(state, cook);
  let best = null;
  for (const station of state.kitchen.stations) {
    if (unfit(state, station, step)) continue;
    for (const cell of station.access) {
      const steps = distances.get(keyOf(cell));
      // A burnt stove costs its cleaning: a clean one a little further is better.
      const cost = steps + (state.dirty.has(keyOf(station)) ? state.setup.unattended.clean : 0);
      if (steps !== undefined && !taken.has(keyOf(cell)) && (!best || cost < best.cost)) best = { station, cell, steps, cost };
    }
  }
  return best;
}

const sides = new WeakMap();
/** Every floor cell a cook works a station from. */
function workCells(state) {
  if (!sides.has(state.kitchen)) sides.set(state.kitchen, new Set(state.kitchen.stations.flatMap((station) => station.access.map(keyOf))));
  return sides.get(state.kitchen);
}

/**
 * A cook stuck two turns in a row gives way: a few steps to a free floor cell off the stations, drawn at
 * random, so two cooks waiting on each other (one in a dead end, the other in its way) come apart.
 */
function giveWay(state, cook) {
  cook.stalled += 1;
  if (cook.stalled < 2) return;
  const taken = takenCells(state, cook);
  const near = [...distancesFrom(state.kitchen, cook)].filter(([key, steps]) => steps > 0 && steps <= 4 && !taken.has(key) && !workCells(state).has(key));
  if (near.length === 0) return;
  const [x, y] = near[state.rng.int(near.length)][0].split(",").map(Number);
  if (planLeg(state, cook, { x, y })) cook.stalled = 0;
}

/** A cook who must wait does not stand in front of a station: back to its place, or out of the way. */
function stepAside(state, cook) {
  if (cook.target) return;
  const inFront = workCells(state).has(keyOf(cook)) && (cook.x !== cook.home.x || cook.y !== cook.home.y);
  if (inFront && planLeg(state, cook, cook.home)) cook.stalled = 0;
  else if (cook.phase === "next" || inFront) giveWay(state, cook);
}

/** A cutting robot, its onions cut, hands them over when a counter is free: it puts them down instead of cooking. */
const handsOver = (state, cook) => cook.steps[cook.step].type === "cook" && ((cook.role === "coupe" && !fromCounter(cook)) || potsInTheWay(state, cook)) && Boolean(stationFor(state, cook, PUT));
/** Did `cook` take its onions up from a counter (helping with the cooking)? Then it cooks them: putting them back down would loop. */
const fromCounter = (cook) => cook.steps[0].type === "pickup";
/** Every stove taken and a soup ready on one: a cook with cut onions in hand puts them down to take the soup off. */
const potsInTheWay = (state, cook) => state.setup.unattended && !stationFor(state, cook, cook.steps[cook.step]) && state.upcoming.some((order) => order.status === "ready");
/** Is a stove free (no pot, nobody cooking there)? */
const stoveFree = (state) => state.kitchen.stations.some((station) => station.kind === "P" && !state.claims.has(keyOf(station)) && !state.pots.has(keyOf(station)));

/**
 * Where `cook` waits for a station of `step`'s kind: the free floor cell nearest one, off every station's
 * side; null when there is none.
 */
function waitSpot(state, cook, step) {
  const taken = takenCells(state, cook);
  const reachable = distancesFrom(state.kitchen, cook);
  let best = null;
  for (const station of state.kitchen.stations) {
    if (station.kind !== step.kind || (step.at && keyOf(station) !== step.at)) continue;
    for (const cell of station.access) {
      for (const [key, steps] of distancesFrom(state.kitchen, cell)) {
        if ((taken.has(key) && key !== keyOf(cook)) || workCells(state).has(key) || !reachable.has(key)) continue;
        if (!best || steps < best.steps) best = { key, steps };
      }
    }
  }
  if (!best) return null;
  const [x, y] = best.key.split(",").map(Number);
  return { x, y };
}

/** A cook who must wait for its station: to the spot nearest it, or out of the way when it stands in front of one. */
function waitFor(state, cook, step) {
  if (cook.target) return;
  // Only a cook with something in hand; one that has not started yet goes back to its place as before.
  const spot = cook.step > 0 ? waitSpot(state, cook, step) : null;
  const there = spot && spot.x === cook.x && spot.y === cook.y;
  if (spot && !there && planLeg(state, cook, spot)) return;
  // Waiting there may block someone in a narrow passage: after a few turns, out of the way as before.
  if (there) cook.stalled += 1;
  if (!there || cook.stalled >= 4) stepAside(state, cook);
}

/**
 * A free cook watching a pot (its own, or any for a `cuisson` robot) waits in front of the stove whose soup is
 * ready first, to take it off at once; false when it watches none or cannot get there.
 */
function watch(state, cook) {
  const pots = [...state.pots].filter(([, pot]) => pot.owner === cook.id || cook.role === "cuisson").sort((a, b) => a[1].ready - b[1].ready);
  if (pots.length === 0) return false;
  const stove = state.kitchen.stations.find((station) => keyOf(station) === pots[0][0]);
  if (stove.access.some((cell) => cell.x === cook.x && cell.y === cook.y)) return true;
  if (cook.target && stove.access.some((cell) => cell.x === cook.target.x && cell.y === cook.target.y)) return true;
  const taken = takenCells(state, cook);
  const cell = stove.access.find((one) => !taken.has(keyOf(one)));
  return Boolean(cell) && planLeg(state, cook, cell);
}

/** The floor distance from `distances` (a BFS map) to the nearest side of `station`, Infinity when out of reach. */
const sideDistance = (distances, station) => Math.min(...station.access.map((cell) => distances.get(keyOf(cell)) ?? Infinity));
/** The floor distance from `distances` to the nearest station of `kind`. */
const kindDistance = (state, distances, kind) => Math.min(...state.kitchen.stations.filter((station) => station.kind === kind).map((station) => sideDistance(distances, station)));

/**
 * A relay for `cook`, its dish in hand and its next step's station `kind` ahead: the free counter to leave it on,
 * or null. Forced when no station of that kind is in its reach (someone who can reach both takes it up);
 * otherwise, for a robot, when a free robot would take it from the counter and finish sooner than the cook
 * itself (counting the put, the wait for the other, the pickup), and the cook saves its own walk.
 */
function relayFor(state, cook) {
  const step = cook.steps[cook.step];
  if (cook.step === 0 || (step.type !== "cook" && step.type !== "serve")) return null;
  const order = orderOf(state, cook);
  if (order.stock || order.relayed) return null;
  const mine = distancesFrom(state.kitchen, cook);
  const own = kindDistance(state, mine, step.kind);
  const forced = own === Infinity;
  // `setup.relay === false` keeps only the forced relays (a measure of what the others are worth).
  if (!forced && (cook.manual || state.setup.relay === false)) return null;
  // Only a robot takes a dish up from a counter (the human is not commanded).
  // A free robot, or the pass's robot for a dish to serve, even busy: it comes once done.
  const others = state.cooks.filter((other) => other !== cook && other.kind === "robot" && (forced || (other.phase === "idle" && !other.order) || (other.role === "passe" && step.type === "serve")));
  if (others.length === 0) return null;
  const maps = new Map(others.map((other) => [other, distancesFrom(state.kitchen, other)]));
  let best = null;
  for (const counter of state.kitchen.stations) {
    if (counter.kind !== "_" || state.shelf.has(keyOf(counter)) || state.claims.has(keyOf(counter))) continue;
    const there = sideDistance(mine, counter);
    if (there === Infinity) continue;
    const ahead = Math.min(...counter.access.map((cell) => kindDistance(state, distancesFrom(state.kitchen, cell), step.kind)));
    for (const other of others) {
      const come = sideDistance(maps.get(other), counter) + (other.order ? 4 : 0);
      if (come === Infinity || ahead === Infinity) continue;
      const latency = Math.max(there + 1, come) + 1 + ahead;
      if (!forced && (there + 1 >= own || latency > own + 2)) continue;
      if (!best || latency < best.latency) best = { counter, latency };
    }
  }
  return best && keyOf(best.counter);
}

/**
 * Giving way at a station (Sami, 23/10): `cook` finds every station of its step taken by cooks still walking there.
 * One that would only get there after `cook` had done its work and left gives its place back: it stops where it
 * is and looks again next turn (it waits near the station). True when a place was given.
 */
function claimFromAfar(state, cook, step) {
  const distances = distancesFrom(state.kitchen, cook);
  for (const other of state.cooks) {
    if (other === cook || other.phase !== "moving" || !other.target || !other.station || other.manual) continue;
    if (unfitKind(state, other.station, step)) continue;
    const mine = distances.get(keyOf(other.target));
    const theirs = (other.path?.at(-1)?.t ?? state.t) - state.t;
    if (mine === undefined || mine + step.turns + 1 >= theirs) continue;
    if (state.claims.get(keyOf(other.station)) === other.id) state.claims.delete(keyOf(other.station));
    const here = [{ x: other.x, y: other.y, t: state.t }];
    state.reservations.release(other.id);
    state.reservations.reserve(other.id, here, { stay: true });
    Object.assign(other, { phase: "next", station: null, target: null, path: here });
    state.log.push({ t: state.t, type: "gaveWay", cook: other.id, to: cook.id });
    return true;
  }
  return false;
}
/** Is `station` of another kind than `step` needs, or not the dish's own counter or stove? Taken or not. */
const unfitKind = (state, station, step) => station.kind !== step.kind || (Boolean(step.at) && keyOf(station) !== step.at);

/** Sends `cook` to its current step's station; waits a turn, near it, when none is free or no path is found. */
function startStep(state, cook) {
  if (handsOver(state, cook)) cook.steps = [...cook.steps.slice(0, cook.step), PUT];
  const relay = relayFor(state, cook);
  if (relay) {
    // Claimed now, so no other cook leaves its dish there meanwhile.
    state.claims.set(relay, cook.id);
    const need = cook.steps[cook.step].kind === "P" ? "cook" : "serve";
    cook.steps = [...cook.steps.slice(0, cook.step), { ...PUT, at: relay }];
    Object.assign(orderOf(state, cook), { relayed: true, relayedBy: cook.id });
    state.log.push({ t: state.t, type: "relay", cook: cook.id, order: cook.order, counter: relay, need });
  }
  const step = cook.steps[cook.step];
  let choice = stationFor(state, cook, step);
  if (!choice && claimFromAfar(state, cook, step)) choice = stationFor(state, cook, step);
  if (!choice || !planLeg(state, cook, choice.cell)) {
    cook.waits += 1;
    waitFor(state, cook, step);
    return;
  }
  if (isWorkStation(step.kind) && !step.at) state.claims.set(keyOf(choice.station), cook.id);
  Object.assign(cook, { phase: "moving", station: choice.station, stalled: 0 });
}

/** Cut onions put down on `cook`'s counter: for a robot to cook, the cook free. */
function putDown(state, cook, order, counter) {
  if (state.claims.get(counter) === cook.id) state.claims.delete(counter);
  state.shelf.set(counter, order.id);
  Object.assign(order, { status: "prepped", cook: null, counter });
  state.log.push({ t: state.t, type: "put", cook: cook.id, order: order.id });
  Object.assign(cook, { order: null, steps: null, step: 0, phase: "idle" });
}

/** The pot on: the soup cooks alone on `cook`'s stove, the stove clean again, the cook free. */
function putOn(state, cook, order, stove) {
  state.dirty.delete(stove);
  state.pots.set(stove, { order: order.id, ready: state.t + RECIPES[order.recipe].cook, owner: cook.id });
  Object.assign(order, { status: "cooking", cook: null, stove });
  state.log.push({ t: state.t, type: "pot", cook: cook.id, order: order.id });
  Object.assign(cook, { order: null, steps: null, step: 0, phase: "idle" });
}

/** A cook whose dish is gone: free, standing where it is. */
function drop(state, cook) {
  state.reservations.release(cook.id);
  const here = [{ x: cook.x, y: cook.y, t: state.t }];
  state.reservations.reserve(cook.id, here, { stay: true });
  Object.assign(cook, { order: null, steps: null, step: 0, phase: "idle", station: null, target: null, path: here, until: null });
}

/** The pots: a soup done is ready; one left `burn` turns past ready burns (unless a cook is taking it up), the order to make again. */
function watchPots(state) {
  for (const [stove, pot] of state.pots) {
    const order = state.upcoming.find((one) => one.id === pot.order);
    if (order.status === "cooking" && state.t >= pot.ready) order.status = "ready";
    if (state.t < pot.ready + state.setup.unattended.burn) continue;
    const cook = state.cooks.find((one) => one.order === order.id);
    if (cook?.phase === "working") continue;
    if (cook) drop(state, cook);
    state.pots.delete(stove);
    state.dirty.add(stove);
    state.burnt += 1;
    // A soup made ahead is simply lost; an order's is to make again.
    if (order.stock) state.upcoming.splice(state.upcoming.indexOf(order), 1);
    Object.assign(order, { status: "open", cook: null, stove: null, burnt: (order.burnt ?? 0) + 1 });
    state.log.push({ t: state.t, type: "burnt", order: order.id });
  }
}

/** Work that ends now: the next step, a dish put down or picked up, a pot put on or taken up, or the dish served. */
function finishWork(state) {
  for (const cook of state.cooks) {
    if (cook.until !== state.t) continue;
    const order = orderOf(state, cook);
    const step = cook.steps[cook.step];
    const counter = cook.station && keyOf(cook.station);
    if (cook.station && state.claims.get(counter) === cook.id) state.claims.delete(counter);
    Object.assign(cook, { until: null, station: null, step: cook.step + 1, phase: "next" });
    if (step.type === "clean") {
      state.dirty.delete(counter);
      state.log.push({ t: state.t, type: "cleaned", cook: cook.id });
      Object.assign(cook, { order: null, steps: null, step: 0, phase: "idle" });
      continue;
    }
    if (step.type === "cook" && !state.setup.unattended) order.cooked = true;
    if (step.type === "put") {
      putDown(state, cook, order, counter);
      continue;
    }
    if (step.type === "cook" && state.setup.unattended) {
      putOn(state, cook, order, counter);
      continue;
    }
    if (step.type === "collect") {
      state.pots.delete(counter);
      Object.assign(order, { stove: null, cooked: true });
    }
    if (step.type === "pickup") {
      state.shelf.delete(counter);
      order.counter = null;
    }
    if (cook.step < cook.steps.length) continue;
    Object.assign(order, { status: "served", servedAt: state.t });
    state.log.push({ t: state.t, type: "served", cook: cook.id, order: order.id });
    Object.assign(cook, { order: null, steps: null, step: 0, phase: "idle" });
  }
}

/**
 * What a free cook is asked: the open orders, the soups ready on a stove (and, for a robot, the cut onions
 * waiting on a counter), and `reach(order)`, the floor distance to its ingredient's crate, to the counter or
 * to the stove. A robot with a role is offered the work of its role, everything when there is none.
 */
function choiceOf(state, cook) {
  // Cut onions are offered only while a stove is free: taken up with every stove holding a pot, they would wait in hand.
  const cookable = !state.setup.unattended || stoveFree(state);
  // A soup ready on a stove: only if the cook gets there before it burns; the keyboard chef's own, left to him
  // until it is about to burn (Sami, 23/10: a robot set off for it and arrived too late).
  const inTime = (order) => {
    if (order.status !== "ready" || !state.setup.unattended) return true;
    const pot = state.pots.get(order.stove);
    const left = pot.ready + state.setup.unattended.burn - state.t;
    const owner = state.cooks.find((one) => one.id === pot.owner);
    return reach(order) + 1 <= left && (!owner?.manual || owner === cook || left <= reach(order) + 3);
  };
  const offered = (order) => !order.stock && (order.status === "open" || order.status === "ready" || (cook.kind === "robot" && order.status === "prepped" && (cookable || servable(order))));
  const distances = distancesFrom(state.kitchen, cook);
  const distanceTo = (station) => sideDistance(distances, station);
  const at = (order) => (order.status === "prepped" ? order.counter : order.status === "ready" ? order.stove : null);
  const reach = (order) => Math.min(...state.kitchen.stations.filter((station) => (at(order) ? keyOf(station) === at(order) : station.kind === RECIPES[order.recipe].ingredient)).map(distanceTo));
  // Only what this cook can reach (a kitchen cut in two); a dish on a counter, only if it can also reach what it
  // needs next (taking up the dish it has just left for someone else would loop).
  const nextKind = (order) => (servable(order) ? "S" : "P");
  const all = state.upcoming.filter((order) => offered(order) && reach(order) < Infinity && (order.status !== "prepped" || (order.relayedBy !== cook.id && kindDistance(state, distances, nextKind(order)) < Infinity)) && inTime(order));
  // Cut onions piling up on the counters (two or more): the stove is behind, any robot gives a hand.
  const pile = all.filter((order) => order.status === "prepped");
  const mine = all.filter((order) => fitsRole(cook.role, order) || (pile.length >= PILE && order.status === "prepped"));
  // A cooking robot watches the stoves while a pot is on: it helps elsewhere only when none is.
  const watching = (cook.role === "cuisson" && state.pots.size > 0) || (cook.role === "passe" && dishOnItsWay(state, cook));
  const open = mine.length > 0 || watching ? mine : all;
  // A cook whose pot is on keeps an eye on it: a soup to take off, or an order it cuts before its own is ready.
  const own = [...state.pots.values()].find((pot) => pot.owner === cook.id && state.t < pot.ready);
  if (own) return { cook, open: open.filter((order) => order.status === "ready" || (order.status === "open" && reach(order) + 1 + RECIPES[order.recipe].cut + 2 <= own.ready - state.t)), reach };
  return { cook, open, reach };
}

/** A dish in the making somewhere (in a cook's hands once fetched, on a counter, on a stove): the pass's robot waits for it. */
const dishOnItsWay = (state, cook) => state.pots.size > 0 || state.shelf.size > 0 || state.cooks.some((other) => other !== cook && other.order && other.step > 0);

/** `choice.cook` takes order `id`, or, with none, goes back to its place or out of the way. */
function take(state, choice, id) {
  const chosen = choice.open.find((order) => order.id === id);
  const { cook } = choice;
  if (!chosen) {
    if (!state.setup.unattended || !watch(state, cook)) stepAside(state, cook);
    return;
  }
  const steps = stepsFrom(chosen);
  Object.assign(chosen, { status: "taken", cook: cook.id });
  Object.assign(cook, { order: chosen.id, steps, step: 0, phase: "next" });
  state.log.push({ t: state.t, type: "taken", cook: cook.id, order: chosen.id });
}

/** What a rule or the human is given: the open orders and `{ t, reach, rng, state }` (only the search reads `state`). */
const ask = (state, choice, rule) => (choice.open.length ? rule(choice.open, { t: state.t, reach: choice.reach, rng: state.rng, state })?.id : null);

/**
 * Batches made ahead: the oldest open order of the same dish takes each over, where it stands (in the chef's
 * hands, on a counter, on a stove), and the batch is gone.
 */
function adoptStock(state) {
  for (const stock of state.upcoming.filter((order) => order.stock)) {
    const order = state.upcoming.filter((one) => !one.stock && one.status === "open" && one.recipe === stock.recipe).sort((a, b) => a.arrival - b.arrival)[0];
    if (!order) continue;
    Object.assign(order, { status: stock.status, cook: stock.cook, counter: stock.counter ?? null, stove: stock.stove ?? null, cooked: stock.cooked ?? false });
    for (const cook of state.cooks) if (cook.order === stock.id) cook.order = order.id;
    for (const [key, id] of state.shelf) if (id === stock.id) state.shelf.set(key, order.id);
    for (const pot of state.pots.values()) if (pot.order === stock.id) pot.order = order.id;
    state.upcoming.splice(state.upcoming.indexOf(stock), 1);
    state.log.push({ t: state.t, type: "adopted", order: order.id });
  }
}

/** The start of a turn, up to the robots' choices: work ended, orders come in, the human takes his (he does not wait for the robots). */
export function beginTurn(state, human) {
  finishWork(state);
  if (state.setup.unattended) watchPots(state);
  for (const order of state.upcoming) if (order.status === "upcoming" && order.arrival <= state.t) order.status = "open";
  adoptStock(state);
  const person = state.cooks.find((cook) => cook.kind === "human" && !cook.manual && cook.phase === "idle");
  if (person && human) {
    const choice = choiceOf(state, person);
    take(state, choice, ask(state, choice, human));
  }
  state.cursor = 0;
}

/**
 * The next free robot of this turn with orders to choose from: `{ cook, open, reach }`, or null once every
 * robot has had its turn. A free robot with no order open goes back to its place on the way.
 */
export function nextChoice(state) {
  for (; state.cursor < state.cooks.length; state.cursor += 1) {
    const cook = state.cooks[state.cursor];
    if (cook.kind !== "robot" || cook.phase !== "idle") continue;
    const choice = choiceOf(state, cook);
    if (choice.open.length > 0) return choice;
    if (!state.setup.unattended || !watch(state, cook)) stepAside(state, cook);
  }
  return null;
}

/** `choice.cook` takes order `id`, and the turn moves to the next robot. */
export function choose(state, choice, id) {
  state.cursor += 1;
  take(state, choice, id);
}

/** The end of a turn, after the choices: cooks set off for their step's station, and everyone moves. */
export function endTurn(state) {
  for (const cook of state.cooks) if (cook.phase === "next" && !cook.manual) startStep(state, cook);
  move(state);
  state.cursor = null;
}

const positionAt = (path, t) => path.find((step) => step.t === t) ?? path.at(-1);

/** One turn: every cook to its leg's next cell; those who reach their station start working. */
function move(state) {
  state.t += 1;
  for (const cook of state.cooks) {
    if (cook.path) {
      const next = positionAt(cook.path, state.t);
      if (next.x !== cook.x || next.y !== cook.y) cook.moves += 1;
      else if (cook.phase === "moving") cook.waits += 1;
      Object.assign(cook, { x: next.x, y: next.y });
    }
    if (cook.target && cook.x === cook.target.x && cook.y === cook.target.y) {
      cook.target = null;
      if (cook.phase === "moving") {
        const turns = turnsOf(state, cook.steps[cook.step], cook.station);
        Object.assign(cook, { phase: "working", until: state.t + turns, span: turns });
      }
    }
  }
}

/** Plays one turn of `state`: robots under `rule`, the human under `human` (HUMANS, rules.js). */
export function stepService(state, rule, human) {
  if (state.cursor === null) beginTurn(state, human);
  for (let choice = nextChoice(state); choice; choice = nextChoice(state)) choose(state, choice, ask(state, choice, rule));
  endTurn(state);
  return state;
}

export const isOver = (state) => state.t >= state.setup.service;

/**
 * Runs the service to the robots' next choice (turns go by while no robot has one), the human under `human`:
 * the choice, or null once the service is over or turn `until` is reached.
 */
export function advance(state, human, until = state.setup.service) {
  for (;;) {
    if (state.cursor === null) {
      if (isOver(state) || state.t >= until) return null;
      beginTurn(state, human);
    }
    const choice = nextChoice(state);
    if (choice) return choice;
    endTurn(state);
  }
}

/** The cook played at the keyboard, or null. */
const manualCook = (state) => state.cooks.find((cook) => cook.manual) ?? null;

/**
 * Moves the chef one cell (`dx`, `dy`) during the coming turn, if the cell is floor and nobody holds it then.
 * The robots whose path crosses his new cell later plan again around him. Returns what happened, in words.
 */
export function steer(state, dx, dy) {
  const cook = manualCook(state);
  if (!cook) return "pas de chef au clavier";
  if (cook.phase === "working") return "le chef travaille : attendez la fin de son geste";
  const to = { x: cook.x + dx, y: cook.y + dy };
  const { reservations, t } = state;
  if (!state.kitchen.floor(state.kitchen.plan.at(to.x, to.y))) return "un mur ou un poste";
  if (!reservations.isFree(to.x, to.y, t + 1, cook.id) || reservations.swaps(cook, to, t, cook.id)) return "un robot passe là";
  const path = [{ x: cook.x, y: cook.y, t }, { ...to, t: t + 1 }];
  reservations.release(cook.id);
  reservations.reserve(cook.id, path, { stay: true });
  Object.assign(cook, { path, target: null });
  // The robots adapt: a planned path through the chef's new cell is planned again.
  for (const robot of state.cooks) {
    if (robot === cook || !robot.target) continue;
    if ((robot.path ?? []).some((step) => step.t > t && step.x === to.x && step.y === to.y)) {
      state.replans = (state.replans ?? 0) + 1;
      if (!planLeg(state, robot, robot.target)) {
        const here = [{ x: robot.x, y: robot.y, t }];
        reservations.release(robot.id);
        reservations.reserve(robot.id, here, { stay: true });
        robot.path = here;
      }
    }
  }
  return null;
}

function startWork(state, cook, station) {
  const step = cook.steps[cook.step];
  if (isWorkStation(step.kind) && !step.at) state.claims.set(keyOf(station), cook.id);
  const turns = turnsOf(state, step, station);
  Object.assign(cook, { phase: "working", station, until: state.t + turns, span: turns, target: null });
}

const NAMES = Object.freeze({ o: "la caisse d'oignons", t: "la caisse de tomates", C: "une planche", P: "un fourneau", S: "le passe", _: "un comptoir" });

/** The chef works the station beside him, if it is the one his dish needs now. Returns what happened, in words. */
export function interact(state) {
  const cook = manualCook(state);
  if (!cook) return "pas de chef au clavier";
  if (cook.phase === "working") return "le chef travaille déjà";
  const here = state.kitchen.stations.filter((station) => station.access.some((cell) => cell.x === cook.x && cell.y === cook.y));
  if (here.length === 0) return "aucun poste à portée : mettez-vous à côté";
  if (!cook.order) {
    for (const station of here) {
      if (station.kind === "P" && state.dirty.has(keyOf(station)) && !state.pots.has(keyOf(station)) && !state.claims.has(keyOf(station))) {
        Object.assign(cook, { steps: [{ type: "clean", kind: "P", turns: state.setup.unattended?.clean ?? 1 }], step: 0 });
        startWork(state, cook, station);
        return `le chef récure le fourneau brûlé (${cook.span} tours)`;
      }
      if (station.kind === "o" || station.kind === "t") {
        let order = state.upcoming.filter((one) => !one.stock && one.status === "open" && RECIPES[one.recipe].ingredient === station.kind).sort((a, b) => a.deadline - b.deadline)[0];
        if (!order) {
          // No order for it yet: a batch made ahead, for the next one.
          const recipe = Object.keys(RECIPES).find((name) => RECIPES[name].ingredient === station.kind);
          state.stocked = (state.stocked ?? 0) + 1;
          order = { id: -state.stocked, recipe, arrival: Infinity, deadline: Infinity, status: "open", cook: null, servedAt: null, stock: true };
          state.upcoming.push(order);
          Object.assign(order, { status: "taken", cook: cook.id });
          Object.assign(cook, { order: order.id, steps: stepsOf(order.recipe), step: 0 });
          startWork(state, cook, station);
          return `le chef prend ${station.kind === "o" ? "des oignons" : "des tomates"} en avance, pour la prochaine commande`;
        }
        Object.assign(order, { status: "taken", cook: cook.id });
        Object.assign(cook, { order: order.id, steps: stepsOf(order.recipe), step: 0 });
        state.log.push({ t: state.t, type: "taken", cook: cook.id, order: order.id });
        startWork(state, cook, station);
        return `le chef prend la commande ${order.id} (${RECIPES[order.recipe].label})`;
      }
      if (station.kind === "_" && state.shelf.has(keyOf(station))) {
        const order = state.upcoming.find((one) => one.id === state.shelf.get(keyOf(station)));
        if (order.status !== "prepped") return "un robot vient déjà le chercher";
        Object.assign(order, { status: "taken", cook: cook.id });
        Object.assign(cook, { order: order.id, steps: pickupSteps(order.counter, order.recipe, order.cooked), step: 0 });
        startWork(state, cook, station);
        return order.stock ? "le chef reprend sa préparation d'avance" : `le chef reprend la commande ${order.id} sur le comptoir`;
      }
      if (station.kind === "P" && state.pots.has(keyOf(station))) {
        const order = state.upcoming.find((one) => one.id === state.pots.get(keyOf(station)).order);
        if (order.status === "cooking") return `la soupe cuit encore (prête au tour ${state.pots.get(keyOf(station)).ready})`;
        // A robot on its way for it gives it back to the chef, who is there (Sami, 23/10: it got there too late).
        const coming = order.status === "taken" ? state.cooks.find((one) => one.id === order.cook && one.phase !== "working") : null;
        if (order.status !== "ready" && !coming) return "un robot la retire déjà du feu";
        if (coming) drop(state, coming);
        Object.assign(order, { status: "taken", cook: cook.id });
        Object.assign(cook, { order: order.id, steps: collectSteps(order.stove), step: 0 });
        startWork(state, cook, station);
        return `le chef prend la soupe de la commande ${order.id} sur le feu${coming ? ` (le robot ${coming.id} y allait)` : ""}`;
      }
    }
    return "les mains vides : prenez un ingrédient à sa caisse, des oignons coupés sur un comptoir ou une soupe prête sur le feu";
  }
  const step = cook.steps[cook.step];
  // Anything cut, cooked or not, may wait on a counter for someone else, or for an order.
  if (step.type === "cook" || step.type === "serve") {
    const counter = here.find((station) => station.kind === "_" && !unfit(state, station, PUT));
    if (counter) {
      cook.steps = [...cook.steps.slice(0, cook.step), PUT];
      startWork(state, cook, counter);
      return `le chef pose ${step.type === "cook" ? "les oignons coupés" : RECIPES[orderOf(state, cook).recipe].label} sur le comptoir`;
    }
  }
  if (step.type === "serve" && orderOf(state, cook).stock) return "pas encore de commande pour ce plat : posez-le sur un comptoir, ou attendez qu'elle arrive";
  const station = here.find((one) => !unfit(state, one, step));
  if (!station) return here.some((one) => one.kind === step.kind) ? `${NAMES[step.kind]} est occupé` : `il faut ${NAMES[step.kind]}`;
  const cleaning = step.type === "cook" && state.setup.unattended && state.dirty.has(keyOf(station));
  startWork(state, cook, station);
  return cleaning ? `le chef nettoie le fourneau brûlé (${state.setup.unattended.clean} tours), puis pose la marmite` : null;
}

/** A copy of `state` the search may play forward: cooks, orders, claims, reservations and the draws copied. */
export function cloneService(state) {
  return {
    ...state,
    cooks: state.cooks.map((cook) => ({ ...cook })),
    upcoming: state.upcoming.map((order) => ({ ...order })),
    claims: new Map(state.claims),
    shelf: new Map(state.shelf),
    pots: new Map([...state.pots].map(([key, pot]) => [key, { ...pot }])),
    dirty: new Set(state.dirty),
    reservations: state.reservations.clone(),
    rng: state.rng.clone(),
    log: [],
  };
}

/**
 * The service's measures: orders come, served in time (the score a team should raise), served late, not
 * served by the end, the mean time from order to table, and the cooks' moves and waits; with unattended
 * cooking, the soups burnt.
 */
export function measuresOf(state) {
  const come = state.upcoming.filter((order) => order.arrival <= state.t);
  const served = come.filter((order) => order.status === "served");
  return {
    orders: come.length,
    onTime: served.filter((order) => order.servedAt <= order.deadline).length,
    late: served.filter((order) => order.servedAt > order.deadline).length,
    missed: come.length - served.length,
    meanServe: served.length ? served.reduce((sum, order) => sum + order.servedAt - order.arrival, 0) / served.length : 0,
    moves: state.cooks.reduce((sum, cook) => sum + cook.moves, 0),
    waits: state.cooks.reduce((sum, cook) => sum + cook.waits, 0),
    ...(state.setup.unattended ? { burnt: state.burnt } : {}),
  };
}

/** A whole service of `setup` from `seed`: robots under `rule`, the human under `human` (null: robots alone). */
export function runService(setup, seed, rule, human, humanName = "urgent") {
  const state = createService(setup, drawOrders(seed, setup), { human: human ? humanName : null, seed });
  while (!isOver(state)) stepService(state, rule, human);
  return { state, measures: measuresOf(state) };
}
