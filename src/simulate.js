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
  return { kitchen, setup, human, rng: createRng(seed + 7_919), t: 0, cooks, upcoming: orders.map((order) => ({ ...order, status: "upcoming", cook: null, servedAt: null })), claims: new Map(), shelf: new Map(), reservations, log: [], cursor: null };
}

const isWorkStation = (kind) => kind === "C" || kind === "P" || kind === "_";
const keyOf = (cell) => `${cell.x},${cell.y}`;
/** Cut onions waiting on the counters from which any robot helps cook them. */
const PILE = 2;
/** Putting cut onions down on a counter. */
const PUT = Object.freeze({ type: "put", kind: "_", turns: 1 });
/** Cut onions waiting on counter `counter` ("x,y"): pick them up there, cook them, serve the dish. */
const pickupSteps = (counter, recipe) => [{ type: "pickup", kind: "_", counter, turns: 1 }, ...stepsOf(recipe).filter((step) => step.type === "cook" || step.type === "serve")];
/** Does order `order` (open, or prepped on a counter) belong to role `role`? Any order for no role. */
export function fitsRole(role, order) {
  const cooked = RECIPES[order.recipe].cook > 0;
  if (role === "coupe") return order.status === "open" && cooked;
  if (role === "cuisson") return order.status === "prepped";
  if (role === "salade") return order.status === "open" && !cooked;
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

/** Is `station` of no use to `step`: another kind, taken, or (a counter) holding a dish, or not the dish's counter? */
function unfit(state, station, step) {
  if (station.kind !== step.kind) return true;
  if (step.counter) return keyOf(station) !== step.counter;
  return isWorkStation(step.kind) && (state.claims.has(keyOf(station)) || state.shelf.has(keyOf(station)));
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
      if (steps !== undefined && !taken.has(keyOf(cell)) && (!best || steps < best.steps)) best = { station, cell, steps };
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
const handsOver = (state, cook) => cook.role === "coupe" && cook.steps[cook.step].type === "cook" && Boolean(stationFor(state, cook, PUT));

/**
 * Where `cook` waits for a station of `step`'s kind: the free floor cell nearest one, off every station's
 * side; null when there is none.
 */
function waitSpot(state, cook, step) {
  const taken = takenCells(state, cook);
  const reachable = distancesFrom(state.kitchen, cook);
  let best = null;
  for (const station of state.kitchen.stations) {
    if (station.kind !== step.kind || (step.counter && keyOf(station) !== step.counter)) continue;
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

/** Sends `cook` to its current step's station; waits a turn, near it, when none is free or no path is found. */
function startStep(state, cook) {
  if (handsOver(state, cook)) cook.steps = [...cook.steps.slice(0, cook.step), PUT];
  const step = cook.steps[cook.step];
  const choice = stationFor(state, cook, step);
  if (!choice || !planLeg(state, cook, choice.cell)) {
    cook.waits += 1;
    waitFor(state, cook, step);
    return;
  }
  if (isWorkStation(step.kind) && step.type !== "pickup") state.claims.set(keyOf(choice.station), cook.id);
  Object.assign(cook, { phase: "moving", station: choice.station, stalled: 0 });
}

/** Cut onions put down on `cook`'s counter: for a robot to cook, the cook free. */
function putDown(state, cook, order, counter) {
  state.shelf.set(counter, order.id);
  Object.assign(order, { status: "prepped", cook: null, counter });
  state.log.push({ t: state.t, type: "put", cook: cook.id, order: order.id });
  Object.assign(cook, { order: null, steps: null, step: 0, phase: "idle" });
}

/** Work that ends now: the next step, a dish put down or picked up, or the dish served. */
function finishWork(state) {
  for (const cook of state.cooks) {
    if (cook.until !== state.t) continue;
    const order = orderOf(state, cook);
    const step = cook.steps[cook.step];
    const counter = cook.station && keyOf(cook.station);
    if (cook.station && state.claims.get(counter) === cook.id) state.claims.delete(counter);
    Object.assign(cook, { until: null, station: null, step: cook.step + 1, phase: "next" });
    if (step.type === "put") {
      putDown(state, cook, order, counter);
      continue;
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
 * What a free cook is asked: the open orders (and, for a robot, the cut onions waiting on a counter), and
 * `reach(order)`, the floor distance to its ingredient's crate, or to the counter. A robot with a role is
 * offered the work of its role, everything when there is none.
 */
function choiceOf(state, cook) {
  const all = state.upcoming.filter((order) => order.status === "open" || (cook.kind === "robot" && order.status === "prepped"));
  // Cut onions piling up on the counters (two or more): the stove is behind, any robot gives a hand.
  const pile = all.filter((order) => order.status === "prepped");
  const mine = all.filter((order) => fitsRole(cook.role, order) || (pile.length >= PILE && order.status === "prepped"));
  const open = mine.length > 0 ? mine : all;
  const distances = distancesFrom(state.kitchen, cook);
  const distanceTo = (station) => Math.min(...station.access.map((cell) => distances.get(keyOf(cell)) ?? Infinity));
  const reach = (order) => Math.min(...state.kitchen.stations.filter((station) => (order.status === "prepped" ? keyOf(station) === order.counter : station.kind === RECIPES[order.recipe].ingredient)).map(distanceTo));
  return { cook, open, reach };
}

/** `choice.cook` takes order `id`, or, with none, goes back to its place or out of the way. */
function take(state, choice, id) {
  const chosen = choice.open.find((order) => order.id === id);
  const { cook } = choice;
  if (!chosen) {
    stepAside(state, cook);
    return;
  }
  const steps = chosen.status === "prepped" ? pickupSteps(chosen.counter, chosen.recipe) : stepsOf(chosen.recipe);
  Object.assign(chosen, { status: "taken", cook: cook.id });
  Object.assign(cook, { order: chosen.id, steps, step: 0, phase: "next" });
  state.log.push({ t: state.t, type: "taken", cook: cook.id, order: chosen.id });
}

/** What a rule or the human is given: the open orders and `{ t, reach, rng, state }` (only the search reads `state`). */
const ask = (state, choice, rule) => (choice.open.length ? rule(choice.open, { t: state.t, reach: choice.reach, rng: state.rng, state })?.id : null);

/** The start of a turn, up to the robots' choices: work ended, orders come in, the human takes his (he does not wait for the robots). */
export function beginTurn(state, human) {
  finishWork(state);
  for (const order of state.upcoming) if (order.status === "upcoming" && order.arrival <= state.t) order.status = "open";
  const person = state.cooks.find((cook) => cook.kind === "human" && !cook.manual && cook.phase === "idle");
  if (person) {
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
    stepAside(state, cook);
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
      if (cook.phase === "moving") Object.assign(cook, { phase: "working", until: state.t + cook.steps[cook.step].turns });
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
  if (isWorkStation(step.kind) && step.type !== "pickup") state.claims.set(keyOf(station), cook.id);
  Object.assign(cook, { phase: "working", station, until: state.t + step.turns, target: null });
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
      if (station.kind === "o" || station.kind === "t") {
        const order = state.upcoming.filter((one) => one.status === "open" && RECIPES[one.recipe].ingredient === station.kind).sort((a, b) => a.deadline - b.deadline)[0];
        if (!order) return `aucune commande ouverte avec ${station.kind === "o" ? "des oignons" : "des tomates"}`;
        Object.assign(order, { status: "taken", cook: cook.id });
        Object.assign(cook, { order: order.id, steps: stepsOf(order.recipe), step: 0 });
        state.log.push({ t: state.t, type: "taken", cook: cook.id, order: order.id });
        startWork(state, cook, station);
        return `le chef prend la commande ${order.id} (${RECIPES[order.recipe].label})`;
      }
      if (station.kind === "_" && state.shelf.has(keyOf(station))) {
        const order = state.upcoming.find((one) => one.id === state.shelf.get(keyOf(station)));
        if (order.status !== "prepped") return "un robot vient déjà les chercher";
        Object.assign(order, { status: "taken", cook: cook.id });
        Object.assign(cook, { order: order.id, steps: pickupSteps(order.counter, order.recipe), step: 0 });
        startWork(state, cook, station);
        return `le chef reprend les oignons coupés de la commande ${order.id}`;
      }
    }
    return "les mains vides : prenez un ingrédient à sa caisse, ou des oignons coupés sur un comptoir";
  }
  const step = cook.steps[cook.step];
  if (step.type === "cook") {
    const counter = here.find((station) => station.kind === "_" && !unfit(state, station, PUT));
    if (counter) {
      cook.steps = [...cook.steps.slice(0, cook.step), PUT];
      startWork(state, cook, counter);
      return "le chef pose les oignons coupés sur le comptoir";
    }
  }
  const station = here.find((one) => !unfit(state, one, step));
  if (!station) return here.some((one) => one.kind === step.kind) ? `${NAMES[step.kind]} est occupé` : `il faut ${NAMES[step.kind]}`;
  startWork(state, cook, station);
  return null;
}

/** A copy of `state` the search may play forward: cooks, orders, claims, reservations and the draws copied. */
export function cloneService(state) {
  return {
    ...state,
    cooks: state.cooks.map((cook) => ({ ...cook })),
    upcoming: state.upcoming.map((order) => ({ ...order })),
    claims: new Map(state.claims),
    shelf: new Map(state.shelf),
    reservations: state.reservations.clone(),
    rng: state.rng.clone(),
    log: [],
  };
}

/**
 * The service's measures: orders come, served in time (the score a team should raise), served late, not
 * served by the end, the mean time from order to table, and the cooks' moves and waits.
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
  };
}

/** A whole service of `setup` from `seed`: robots under `rule`, the human under `human` (null: robots alone). */
export function runService(setup, seed, rule, human, humanName = "urgent") {
  const state = createService(setup, drawOrders(seed, setup), { human: human ? humanName : null, seed });
  while (!isOver(state)) stepService(state, rule, human);
  return { state, measures: measuresOf(state) };
}
