import { astar } from "mcts-commun/grid.js";
import { distancesFrom, floorWays } from "./kitchen.js";
import { FREE, isWorkStation, keyOf, standsOn } from "./service-basics.js";
import { boardCleaning, useBoard } from "./service-hygiene.js";
import { slower } from "./service-human.js";
import { shutOut } from "./service-crossing.js";

/**
 * The cooks' legs (split from simulate.js, 26/10/2026): the paths reserved in space and time, the station each step
 * goes to, where a cook waits and how it gives way, and the move of a turn.
 *
 * **The pace** (Sami, 26/10: walk faster, as long as nobody overlaps): `setup.pace` cells a turn, 1 by default. The
 * paths are reserved step by step (a step, a cell), a turn being `pace` steps: no two cooks share a cell or swap at
 * any step. The work (cutting, cooking) is still counted in turns.
 */
const LEG_HORIZON = 80;

/** The cells a cook walks in a turn. */
export const paceOf = (state) => state.setup.pace ?? 1;
/** The step the turn `t` starts at, on the reservations' clock. */
export const stepAt = (state, t = state.t) => t * paceOf(state);

/** Plans `cook`'s leg to `target` and reserves it, its last cell kept; false when no path is found. */
export function planLeg(state, cook, target) {
  // None when the cook or its target is shut in (service-crossing.js); else a free path straight down the floor's
  // distances first (mcts-commun's `direct`), A* when a cell there is taken.
  const path = shutOut(state, cook, target, stepAt(state)) ? null : astar(state.kitchen.plan, cook, target, { passable: state.kitchen.floor, reservations: state.reservations, unit: cook.id, start: stepAt(state), horizon: LEG_HORIZON * paceOf(state), park: true, direct: floorWays(state.kitchen) });
  if (!path) return false;
  state.reservations.release(cook.id);
  state.reservations.reserve(cook.id, path, { stay: true });
  Object.assign(cook, { path, target });
  return true;
}

/**
 * `cook` holds the cell it stands on from now: its reservations released, its path that one cell. The robots due
 * there later plan again around it (27/10/2026: a robot stopped on a cell another was to pass two steps later, and
 * both stood on it; one case in about 600 services).
 */
export function holdHere(state, cook) {
  const here = [{ x: cook.x, y: cook.y, t: stepAt(state) }];
  state.reservations.release(cook.id);
  state.reservations.reserve(cook.id, here, { stay: true });
  cook.path = here;
  makeWay(state, cook, here[0], here[0].t - 1);
  return here;
}

/** The robots adapt: a planned path through `cook`'s cell `to` after step `after` is planned again, or they stop where they are. */
export function makeWay(state, cook, to, after) {
  for (const robot of state.cooks) {
    if (robot === cook || !robot.target) continue;
    if (!(robot.path ?? []).some((step) => step.t > after && standsOn(step, to))) continue;
    state.replans = (state.replans ?? 0) + 1;
    if (!planLeg(state, robot, robot.target)) holdHere(state, robot);
  }
}

/** The cells other cooks stand on or walk to: a station's side taken there is taken. */
export function takenCells(state, cook) {
  return new Set(state.cooks.filter((other) => other !== cook).flatMap((other) => [keyOf(other), ...(other.target ? [keyOf(other.target)] : [])]));
}

/** Is `station` of no use to `step`: another kind, taken, or holding a dish (a counter) or a pot (a stove), or not the dish's own? */
export function unfit(state, station, step) {
  if (station.kind !== step.kind) return true;
  const key = keyOf(station);
  // A relay's counter, chosen and claimed: it must still be empty.
  if (step.at) return key !== step.at || (step.type === "put" && state.shelf.has(key));
  return isWorkStation(step.kind) && (state.claims.has(key) || state.shelf.has(key) || state.pots.has(key));
}

/** Is `station` of another kind than `step` needs, or not the dish's own counter or stove? Taken or not. */
export const unfitKind = (station, step) => station.kind !== step.kind || (Boolean(step.at) && keyOf(station) !== step.at);

/**
 * How long `step` takes at `station` for `cook`: putting a pot on is one turn when it cooks alone, the cleaning first on a
 * burnt stove; a cut, the board's cleaning first when it must be cleaned (service-hygiene.js).
 */
export function turnsOf(state, step, station, cook) {
  if (step.type === "cut") return step.turns + boardCleaning(state, station, cook);
  const { unattended } = state.setup;
  if (step.type !== "cook" || !unattended) return step.turns;
  return 1 + (state.dirty.has(keyOf(station)) ? unattended.clean : 0);
}

/** The nearest free side of `station` from `distances`, if nearer than `best` (a burnt stove counts its cleaning). */
function nearerSide(state, station, { distances, taken, cook, step }, best) {
  // A burnt stove, or a board to clean, costs its cleaning: a clean one a little further is better.
  const extra = (state.dirty.has(keyOf(station)) ? state.setup.unattended.clean : 0) + (step.type === "cut" ? boardCleaning(state, station, cook) : 0);
  for (const cell of station.access) {
    const steps = distances.get(keyOf(cell));
    const cost = steps / paceOf(state) + extra;
    if (steps !== undefined && !taken.has(keyOf(cell)) && (!best || cost < best.cost)) best = { station, cell, steps, cost };
  }
  return best;
}

/** The station for `cook`'s `step`, and the cell to work it from: the nearest free one, or null. */
export function stationFor(state, cook, step) {
  const around = { distances: distancesFrom(state.kitchen, cook), taken: takenCells(state, cook), cook, step };
  let best = null;
  for (const station of state.kitchen.stations) if (!unfit(state, station, step)) best = nearerSide(state, station, around, best);
  return best;
}

const sides = new WeakMap();
/** Every floor cell a cook works a station from. */
export function workCells(state) {
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
export function stepAside(state, cook) {
  if (cook.target) return;
  const inFront = workCells(state).has(keyOf(cook)) && !standsOn(cook, cook.home);
  if (inFront && planLeg(state, cook, cook.home)) cook.stalled = 0;
  else if (cook.phase === "next" || inFront) giveWay(state, cook);
}

/** The free floor cell nearest `cell` that `cook` can reach, off every station's side, if nearer than `best`. */
function nearerSpot(state, cell, { cook, taken, reachable }, best) {
  for (const [key, steps] of distancesFrom(state.kitchen, cell)) {
    const free = !taken.has(key) || key === keyOf(cook);
    if (free && !workCells(state).has(key) && reachable.has(key) && (!best || steps < best.steps)) best = { key, steps };
  }
  return best;
}

/**
 * Where `cook` waits for a station of `step`'s kind: the free floor cell nearest one, off every station's
 * side; null when there is none.
 */
function waitSpot(state, cook, step) {
  const around = { cook, taken: takenCells(state, cook), reachable: distancesFrom(state.kitchen, cook) };
  let best = null;
  for (const station of state.kitchen.stations) {
    if (unfitKind(station, step)) continue;
    for (const cell of station.access) best = nearerSpot(state, cell, around, best);
  }
  if (!best) return null;
  const [x, y] = best.key.split(",").map(Number);
  return { x, y };
}

/** A cook who must wait for its station: to the spot nearest it, or out of the way when it stands in front of one. */
export function waitFor(state, cook, step) {
  if (cook.target) return;
  // Only a cook with something in hand; one that has not started yet goes back to its place as before.
  const spot = cook.step > 0 ? waitSpot(state, cook, step) : null;
  if (spot && standsOn(cook, spot)) {
    // Waiting there may block someone in a narrow passage: after a few turns, out of the way as before.
    cook.stalled += 1;
    if (cook.stalled >= 4) stepAside(state, cook);
    return;
  }
  if (spot && planLeg(state, cook, spot)) return;
  stepAside(state, cook);
}

/**
 * Is `pot`'s soup another cook's to take off? Its watcher then stops watching: standing in front of the stove, it
 * was in his way (Sami, 26/10: the split kitchen's top stove has a single side, and the soup burnt there).
 */
const takenByOther = (state, cook, pot) => state.cooks.some((other) => other !== cook && other.order === pot.order);

/**
 * A free cook watching a pot (its own, or any for a `cuisson` robot) waits in front of the stove whose soup is
 * ready first, to take it off at once; false when it watches none or cannot get there.
 */
export function watch(state, cook) {
  const pots = [...state.pots].filter(([, pot]) => (pot.owner === cook.id || cook.role === "cuisson") && !takenByOther(state, cook, pot)).sort((a, b) => a[1].ready - b[1].ready);
  if (pots.length === 0) return false;
  const stove = state.kitchen.stations.find((station) => keyOf(station) === pots[0][0]);
  if (stove.access.some((cell) => standsOn(cook, cell))) return true;
  if (cook.target && stove.access.some((cell) => standsOn(cook.target, cell))) return true;
  const taken = takenCells(state, cook);
  const cell = stove.access.find((one) => !taken.has(keyOf(one)));
  return Boolean(cell) && planLeg(state, cook, cell);
}

/** A cook whose dish is gone: free, standing where it is. */
export function drop(state, cook) {
  const here = holdHere(state, cook);
  // The plate he held for it is clean again (service-plates.js).
  if (cook.plate && state.plates) Object.assign(state.plates, { clean: state.plates.clean + 1 });
  cook.plate = false;
  Object.assign(cook, { ...FREE, station: null, target: null, path: here, until: null });
}

/** Has `cook`'s leg ended short of its target, the station still ahead? */
function heldShort(state, cook) {
  if (cook.manual || cook.phase !== "moving" || !cook.target) return false;
  return (cook.path?.at(-1)?.t ?? 0) <= stepAt(state) && !standsOn(cook, cook.target);
}

/**
 * A robot held short of its station, its way gone (Sami, 23/10: the chef stepped onto the cell in front of a board and
 * stayed; the robot waited for it for good, the board kept, and the chef's E there found it taken): it lets the station
 * go and looks again (another one, or it waits). A relay's counter stays its own: it is the dish's.
 */
export function letGo(state) {
  for (const cook of state.cooks) {
    if (!heldShort(state, cook)) continue;
    const key = cook.station && keyOf(cook.station);
    if (key && !relayOf(cook) && state.claims.get(key) === cook.id) state.claims.delete(key);
    Object.assign(cook, { phase: "next", station: null, target: null });
    state.log.push({ t: state.t, type: "letGo", cook: cook.id, station: key });
  }
}

/** The relay's counter `cook`'s step goes to, if it is one. */
const relayOf = (cook) => cook.steps?.[cook.step]?.at;

export const positionAt = (path, step) => path.find((one) => one.t === step) ?? path.at(-1);

/** `cook` one cell along its path at `step`: a move counted; true when it stood still on its way. */
function stepAlong(cook, step) {
  const next = positionAt(cook.path, step);
  const held = standsOn(cook, next) && cook.phase === "moving";
  if (!standsOn(cook, next)) cook.moves += 1;
  Object.assign(cook, { x: next.x, y: next.y });
  return held;
}

/** At the leg's end only: a path may pass the target, step off for someone, and come back (a robot worked while still walking, away from its board). */
function arrive(state, cook, step) {
  if (!cook.target || !standsOn(cook, cook.target) || (cook.path?.at(-1)?.t ?? 0) > step) return;
  cook.target = null;
  if (cook.phase === "moving") startWorking(state, cook);
}

/** `cook` at his station starts his gesture: its turns, a board remembered (service-hygiene.js). */
function startWorking(state, cook) {
  const doing = cook.steps[cook.step];
  const turns = slower(state, cook, turnsOf(state, doing, cook.station, cook));
  if (doing.type === "cut") useBoard(state, cook.station, cook);
  Object.assign(cook, { phase: "working", until: state.t + turns, span: turns });
}

/**
 * One turn: `pace` steps, every cook to its leg's next cell at each; those who reach their station start working (at
 * the turn's end, their gesture counted in turns). A cook held on its way during the turn has waited a turn.
 */
export function move(state) {
  const first = stepAt(state) + 1;
  state.t += 1;
  const held = new Set();
  for (let step = first; step <= stepAt(state); step += 1) {
    for (const cook of state.cooks) {
      if (cook.path && stepAlong(cook, step)) held.add(cook);
      arrive(state, cook, step);
    }
  }
  for (const cook of held) cook.waits += 1;
}
