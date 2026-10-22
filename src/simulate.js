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
export function createService(setup, orders, { human = "urgent", seed = 1 } = {}) {
  const kitchen = readKitchen(setup.text);
  const cook = (id, kind, at) => ({ id, kind, x: at.x, y: at.y, home: at, order: null, step: 0, phase: "idle", station: null, target: null, path: null, until: null, moves: 0, waits: 0, stalled: 0 });
  const cooks = kitchen.robots.map((at, i) => cook(i + 1, "robot", at));
  if (human) cooks.push(cook(cooks.length + 1, "human", kitchen.human));
  const reservations = createReservations();
  // Every cook holds its place from the start: nobody plans through a cook standing still.
  for (const one of cooks) reservations.reserve(one.id, [{ x: one.x, y: one.y, t: 0 }], { stay: true });
  return { kitchen, setup, human, rng: createRng(seed + 7_919), t: 0, cooks, upcoming: orders.map((order) => ({ ...order, status: "upcoming", cook: null, servedAt: null })), claims: new Map(), reservations, log: [] };
}

const isWorkStation = (kind) => kind === "C" || kind === "P";
const keyOf = (cell) => `${cell.x},${cell.y}`;
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

/** The station of `kind` to go to for `cook`, and the cell to work it from: the nearest free one, or null. */
function stationFor(state, cook, kind) {
  const distances = distancesFrom(state.kitchen, cook);
  const taken = takenCells(state, cook);
  let best = null;
  for (const station of state.kitchen.stations) {
    if (station.kind !== kind || (isWorkStation(kind) && state.claims.has(keyOf(station)))) continue;
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

/** Sends `cook` to its current step's station; waits a turn when none is free or no path is found. */
function startStep(state, cook) {
  const step = stepsOf(orderOf(state, cook).recipe)[cook.step];
  const choice = stationFor(state, cook, step.kind);
  if (!choice || !planLeg(state, cook, choice.cell)) {
    cook.waits += 1;
    stepAside(state, cook);
    return;
  }
  if (isWorkStation(step.kind)) state.claims.set(keyOf(choice.station), cook.id);
  Object.assign(cook, { phase: "moving", station: choice.station, stalled: 0 });
}

/** Work that ends now: the next step, or the dish served. */
function finishWork(state) {
  for (const cook of state.cooks) {
    if (cook.until !== state.t) continue;
    const order = orderOf(state, cook);
    if (cook.station && state.claims.get(keyOf(cook.station)) === cook.id) state.claims.delete(keyOf(cook.station));
    Object.assign(cook, { until: null, station: null, step: cook.step + 1, phase: "next" });
    if (cook.step < stepsOf(order.recipe).length) continue;
    Object.assign(order, { status: "served", servedAt: state.t });
    state.log.push({ t: state.t, type: "served", cook: cook.id, order: order.id });
    Object.assign(cook, { order: null, step: 0, phase: "idle" });
  }
}

/** Free cooks take an order (the human first: he does not wait for the robots), or go back to their place. */
function takeOrders(state, rule, human) {
  for (const order of state.upcoming) if (order.status === "upcoming" && order.arrival <= state.t) order.status = "open";
  const free = state.cooks.filter((cook) => cook.phase === "idle").sort((a, b) => (a.kind === "human" ? -1 : 0) - (b.kind === "human" ? -1 : 0));
  for (const cook of free) {
    const open = state.upcoming.filter((order) => order.status === "open");
    const distances = distancesFrom(state.kitchen, cook);
    const reach = (order) => Math.min(...state.kitchen.stations.filter((station) => station.kind === RECIPES[order.recipe].ingredient).flatMap((station) => station.access.map((cell) => distances.get(keyOf(cell)) ?? Infinity)));
    const chosen = open.length ? (cook.kind === "human" ? human : rule)(open, { t: state.t, reach, rng: state.rng }) : null;
    if (chosen) {
      Object.assign(chosen, { status: "taken", cook: cook.id });
      Object.assign(cook, { order: chosen.id, step: 0, phase: "next" });
      state.log.push({ t: state.t, type: "taken", cook: cook.id, order: chosen.id });
    } else {
      stepAside(state, cook);
    }
  }
  for (const cook of state.cooks) if (cook.phase === "next") startStep(state, cook);
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
      if (cook.phase === "moving") Object.assign(cook, { phase: "working", until: state.t + stepsOf(orderOf(state, cook).recipe)[cook.step].turns });
    }
  }
}

/** Plays one turn of `state`: robots under `rule`, the human under `human` (HUMANS, rules.js). */
export function stepService(state, rule, human) {
  finishWork(state);
  takeOrders(state, rule, human);
  move(state);
  return state;
}

export const isOver = (state) => state.t >= state.setup.service;

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
