import { createEvents } from "mcts-commun/events.js";
import { createRng } from "mcts-commun/random.js";
import { START, WALK } from "./day-program.js";

/**
 * The day's engine (Sami, 1/11/2026, docs/journee.md): a queue of events, people who take tasks, and stations a person
 * at a time. As at the urgences' big hospital (docs/recherche/journee.md), nobody plans their steps around the others:
 * a walk follows the plan's cached path and the aisles let everyone through. What happens is written as it goes, each
 * person's `track` of segments: the page replays it (day-scene.js).
 *
 * A task is `{ label, skill, who, priority, legs, done }`: a free person takes the best one they can do. A leg is
 * `{ at, station, seconds, label, carry, keep, take, put, done }`: walk to the nearest free station of kind `at` (or to
 * `station`, already held), work there, let it go unless `keep`. All stations of a kind taken, the person waits beside
 * the nearest one, in line.
 */

const HOT = new Set(["P", "A"]);

export function createWorld(layout, seed) {
  return { layout, rng: createRng(seed), events: createEvents(START), t: START, staff: [], people: [], tasks: [], taskCount: 0, claims: new Map(), lines: new Map(), stock: new Map(), gauges: {}, marks: [], uses: [], log: [], end: START, crates: 0, washing: false, platesWashing: false, ticketCount: 0, room: null, body: null, wasteTrips: {}, wasteFull: {}, closing: false, barPoured: 0, barRestocking: false, bookings: [] };
}

/** Runs `run` at `time`, or now if that has passed. */
export const at = (world, time, run) => world.events.schedule(Math.max(time, world.t), run);

/** Adds someone at `cell`: `spec` their name, mark, kind and skills. They are on the plan from their first segment. */
export function addPerson(world, spec, cell) {
  const person = { ...spec, id: world.people.length, cell, carry: null, track: [], busy: false, walked: 0, task: null, leg: 0, off: false, worked: 0 };
  world.people.push(person);
  if (spec.skills) world.staff.push(person);
  return person;
}

/** A new segment of `person`'s track, from now on. */
export function segment(world, person, parts) {
  person.track.push({ t0: world.t, x: person.cell.x, y: person.cell.y, carry: person.carry, kind: "idle", label: "", ...world.body?.now(person), ...parts });
}

/** Sets a gauge, kept for the page: the value from now on. */
export function gauge(world, name, value) {
  if (!world.gauges[name]) world.gauges[name] = [];
  world.gauges[name].push([world.t, value]);
}

/** Adds `amount` (it may be negative) to a stock, and to its gauge. */
export function addStock(world, name, amount) {
  const value = (world.stock.get(name) ?? 0) + amount;
  world.stock.set(name, value);
  gauge(world, name, value);
}

/** Something to show on a cell from now until `t1`: a pot on a stove, plates on a table. */
export function mark(world, cell, parts) {
  const one = { x: cell.x, y: cell.y, t0: world.t, ...parts };
  world.marks.push(one);
  return one;
}

/** Walks `person` to `cell`, then `then()`. */
export function walkTo(world, person, { cell, label }, then) {
  const path = world.layout.pathOf(person.cell, cell);
  if (path.length <= 1) return then();
  segment(world, person, { kind: "walk", path, label });
  person.walked += path.length - 1;
  person.cell = cell;
  at(world, world.t + (path.length - 1) * WALK, then);
}

/** The nearest free station of kind `kind` from `person`, or null. */
function nearestFree(world, person, kind) {
  const { layout, claims } = world;
  let best = null;
  let bestSteps = Infinity;
  for (const station of layout.stations[kind]) {
    if (claims.has(station.key)) continue;
    const steps = layout.steps(person.cell, layout.near(person.cell, station));
    if (steps >= 0 && steps < bestSteps) [best, bestSteps] = [station, steps];
  }
  return best;
}

/** Lets `station` go: the first in line for its kind tries again. */
export function release(world, station) {
  if (world.claims.delete(station.key)) addStock(world, `pris:${station.kind}`, -1);
  const next = world.lines.get(station.kind)?.shift();
  if (next) startLeg(world, next);
}

/** Every station of `kind` is taken: `person` walks beside the nearest, and waits in line if none has come free by then. */
function queueFor(world, person, { kind, label }) {
  const { layout } = world;
  const nearest = layout.stations[kind].reduce((best, one) => (layout.steps(person.cell, layout.near(person.cell, one)) < layout.steps(person.cell, layout.near(person.cell, best)) ? one : best));
  walkTo(world, person, { cell: layout.near(person.cell, nearest), label }, () => {
    if (nearestFree(world, person, kind)) return startLeg(world, person);
    segment(world, person, { kind: "wait", label: `attend : ${label}` });
    if (!world.lines.has(kind)) world.lines.set(kind, []);
    world.lines.get(kind).push(person);
  });
}

/** The station of `person`'s leg: the one it holds, or the nearest free, claimed. */
function stationFor(world, person, leg) {
  if (leg.station) return leg.station;
  const station = nearestFree(world, person, leg.at);
  if (station) {
    world.claims.set(station.key, person.id);
    addStock(world, `pris:${station.kind}`, 1);
  }
  return station;
}

/** The person's current leg: walk to its station, or wait for one; none left: the task is done. */
function startLeg(world, person) {
  const leg = person.task.legs[person.leg];
  if (!leg) return finishTask(world, person);
  const station = stationFor(world, person, leg);
  if (!station) return queueFor(world, person, { kind: leg.at, label: leg.label });
  walkTo(world, person, { cell: world.layout.near(person.cell, station), label: leg.label }, () => work(world, person, { leg, station }));
}

/** Applies a leg's stock moves. */
function moveStock(world, moves = {}, sign = 1) {
  for (const [name, amount] of Object.entries(moves)) addStock(world, name, sign * amount);
}

/** Works a leg at its station, then goes on to the next. */
function work(world, person, { leg, station }) {
  moveStock(world, leg.take, -1);
  if (leg.carry !== undefined) person.carry = leg.carry;
  person.hot = HOT.has(station.kind);
  const seconds = leg.seconds * (world.body?.pace(person) ?? 1);
  segment(world, person, { kind: "work", label: leg.label, at: { x: station.x, y: station.y }, until: world.t + seconds });
  const t0 = world.t;
  at(world, world.t + seconds, () => {
    world.uses.push({ key: station.key, kind: station.kind, t0, t1: world.t, who: person.id });
    person.worked += world.t - t0;
    moveStock(world, leg.put);
    if (!leg.keep) release(world, station);
    leg.done?.(station, person);
    person.leg += 1;
    startLeg(world, person);
  });
}

function finishTask(world, person) {
  const { task } = person;
  Object.assign(person, { task: null, leg: 0, busy: false });
  segment(world, person, { kind: "idle", label: "attend" });
  task.done?.(person);
  if (!person.off) world.body?.free(person);
}

/** Offers a task to whoever can take it. */
export function offer(world, task) {
  world.tasks.push({ priority: 0, ...task, id: world.taskCount });
  world.taskCount += 1;
}

const canDo = (person, task) => (task.who !== undefined ? task.who === person.id : person.skills.includes(task.skill));

/** How much `person` wants `task`: its priority, then their own work first, then the nearest. */
function wish(world, person, task) {
  const first = task.legs[0];
  const place = first.station ?? world.layout.stations[first.at][0];
  const steps = world.layout.steps(person.cell, world.layout.near(person.cell, place));
  return task.priority * 1000 + (task.who === person.id || person.skills[0] === task.skill ? 500 : 0) - steps;
}

/** The task `person` takes, or null. */
function choose(world, person) {
  let best = null;
  let bestWish = -Infinity;
  for (const task of world.tasks) {
    if (!canDo(person, task)) continue;
    const value = wish(world, person, task);
    if (value > bestWish) [best, bestWish] = [task, value];
  }
  return best;
}

/** Every free person takes the task they want most. */
export function dispatch(world) {
  if (!world.tasks.length) return;
  // The one who has worked least chooses first, so the work is shared out.
  for (const person of world.staff.filter((one) => !one.busy && !one.off).sort((a, b) => a.worked - b.worked)) {
    const task = choose(world, person);
    if (!task) continue;
    world.tasks.splice(world.tasks.indexOf(task), 1);
    Object.assign(person, { task, leg: 0, busy: true });
    startLeg(world, person);
  }
}

/** Plays the events until none is left; the day ends at the last one. */
export function runWorld(world) {
  for (let next = world.events.next(); next; next = world.events.next()) {
    world.t = next.at;
    next.event();
    dispatch(world);
  }
  world.end = world.t;
  return world;
}
