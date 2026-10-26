import { keyOf } from "./service-basics.js";
import { deliveryMeasures } from "./service-delivery.js";
import { miseMeasures } from "./service-mise.js";
import { supplyMeasures } from "./service-supply.js";
import { tableMeasures } from "./service-tables.js";

/**
 * The measures of a service (Sami, 26/10/2026, step 0 of docs/recherche/feuille-de-route.md: the restaurants'
 * indicators, counted, deciding nothing). At the end, from the orders: the ticket time (from the order to the pass)
 * on average, at the 9th decile and at most, the worst lateness, the dishes the human served. Turn by turn, in
 * `state.tally`: the rush (« le coup de feu », the most orders open at once), how busy each station was (the busiest
 * board, stove, pass and counter: the bottleneck), the turns cooks waited for a station, by kind, and the turns a
 * station was claimed by a cook still on his way, nobody at work there (« réservé sans travailler »). At the end
 * also (26/10, the rest of step 0): the dishes each cook handed over, and the orders come and served by slices of
 * `SLICE` turns, the service's curve. The search's worlds count nothing (`tally` null): they decide, they are not
 * measured.
 */

/** The station kinds whose use is measured, by the name a measure gives them. */
const KINDS = Object.freeze({ C: "Board", P: "Stove", S: "Pass", _: "Counter" });
const WORDS = Object.freeze({ Board: "planche", Stove: "fourneau", Pass: "passe", Counter: "comptoir" });
/** The turns of a slice of the service's curve. */
export const SLICE = 25;

/**
 * The bottleneck of `measures` (one service's, or a rule's means): the station kind whose busiest station was at work
 * the most, or the one cooks waited for the most when that is more telling, and the one claimed idle the most.
 * `{ use: { word, share }, wait: { word, turns }, idle: { word, turns } }`.
 */
export function bottleneckOf(measures) {
  const names = Object.values(KINDS).filter((name) => `use${name}` in measures);
  const most = (key) => names.reduce((best, name) => (measures[`${key}${name}`] > measures[`${key}${best}`] ? name : best), names[0]);
  if (names.length === 0) return null;
  const used = most("use");
  const [waited, idle] = [most("wait"), most("idle")];
  return { use: { word: WORDS[used], share: measures[`use${used}`] }, wait: { word: WORDS[waited], turns: measures[`wait${waited}`] }, idle: { word: WORDS[idle], turns: measures[`idle${idle}`] ?? 0 } };
}

/** A service's counts, empty. @returns {import("./types.js").Tally} */
export const createTally = () => ({ turns: 0, peakOpen: 0, peakAt: 0, busy: new Map(), idle: new Map(), waitsFor: {} });

/** Is `station` at work this turn: a cook's gesture there, a pot on it, a dish waiting on it? */
function atWork(state, station, working) {
  const key = keyOf(station);
  return working.has(key) || state.pots.has(key) || state.shelf.has(key);
}

/** The turn about to be played, counted: the orders open, the stations at work. Called once a turn, its orders open. */
export function countTurn(state) {
  const { tally } = state;
  if (!tally) return;
  tally.turns += 1;
  const open = state.upcoming.filter((order) => !order.stock && order.arrival <= state.t && !CLOSED.has(order.status)).length;
  if (open > tally.peakOpen) Object.assign(tally, { peakOpen: open, peakAt: state.t });
  const working = new Set(state.cooks.filter((cook) => cook.phase === "working" && cook.station && cook.until > state.t).map((cook) => keyOf(cook.station)));
  const add = (counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const station of state.kitchen.stations) {
    if (!KINDS[station.kind]) continue;
    if (atWork(state, station, working)) add(tally.busy, keyOf(station));
    else if (state.claims.has(keyOf(station))) add(tally.idle, keyOf(station));
  }
}

/** A cook waits this turn for a station of `kind`, every one taken. */
export function countWait(state, kind) {
  if (state.tally) state.tally.waitsFor[kind] = (state.tally.waitsFor[kind] ?? 0) + 1;
}

/** A dish handed over by its cook: served, or put at the pass to wait for its table. */
const HANDED = new Set(["served", "passed"]);
/** An order no longer open: served, or refused (the dish off the menu). */
const CLOSED = new Set(["served", "refused", "gone"]);

/** The value at rank `share` of the sorted `values` (nearest rank), 0 when there are none. */
const rank = (values, share) => (values.length ? values[Math.ceil(share * values.length) - 1] : 0);

/** The share of the turns the busiest station of each kind was at work, the turns cooks waited for each kind, and the turns its stations were claimed with nobody at work. */
function stationMeasures(state) {
  const { tally } = state;
  const measures = {};
  for (const [kind, name] of Object.entries(KINDS)) {
    const stations = state.kitchen.stations.filter((station) => station.kind === kind);
    if (stations.length === 0) continue;
    measures[`use${name}`] = Math.max(...stations.map((station) => tally.busy.get(keyOf(station)) ?? 0)) / Math.max(1, tally.turns);
    measures[`wait${name}`] = tally.waitsFor[kind] ?? 0;
    measures[`idle${name}`] = stations.reduce((sum, station) => sum + (tally.idle.get(keyOf(station)) ?? 0), 0);
  }
  return measures;
}

/** What the turns counted say: the rush and its turn, the stations' use and the waits for them. */
const tallyMeasures = (state) => (state.tally ? { peakOpen: state.tally.peakOpen, peakAt: state.tally.peakAt, ...stationMeasures(state) } : {});

/** How many of `turns` fall in each slice of `SLICE` turns of a service of `length` turns. */
function slicesOf(turns, length) {
  const slices = Array.from({ length: Math.ceil(length / SLICE) }, () => 0);
  for (const t of turns) slices[Math.min(slices.length - 1, Math.floor(t / SLICE))] += 1;
  return slices;
}

/** The service's curve: the orders come and those served, by slices of `SLICE` turns; and the dishes each cook handed over. */
function curveMeasures(state, come, served) {
  const handed = (cook) => state.log.filter((event) => HANDED.has(event.type) && event.cook === cook.id).length;
  const real = (orders) => orders.filter((order) => !order.stock);
  return {
    servedByCook: state.cooks.map(handed),
    cameBySlice: slicesOf(real(come).map((order) => order.arrival), state.setup.service),
    servedBySlice: slicesOf(real(served).map((order) => order.servedAt), state.setup.service),
  };
}

/**
 * The service's measures: orders come, served in time (the score a team should raise), served late, not
 * served by the end, the ticket time (from the order to the pass: mean, 9th decile, most), the worst lateness, the
 * cooks' moves and waits, the dishes the human served, the curve and each cook's dishes; with unattended cooking, the
 * soups burnt; and what the turns counted say.
 */
export function measuresOf(state) {
  const come = state.upcoming.filter((order) => order.arrival <= state.t);
  const served = come.filter((order) => order.status === "served");
  const times = served.map((order) => order.servedAt - order.arrival).sort((a, b) => a - b);
  const human = state.cooks.find((cook) => cook.kind === "human");
  return {
    orders: come.length,
    onTime: served.filter((order) => order.servedAt <= order.deadline).length,
    late: served.filter((order) => order.servedAt > order.deadline).length,
    missed: come.length - served.length - come.filter((order) => order.status === "refused").length,
    meanServe: served.length ? served.reduce((sum, order) => sum + order.servedAt - order.arrival, 0) / served.length : 0,
    p90Serve: rank(times, 0.9),
    maxServe: rank(times, 1),
    maxLate: Math.max(0, ...served.map((order) => order.servedAt - order.deadline)),
    moves: state.cooks.reduce((sum, cook) => sum + cook.moves, 0),
    waits: state.cooks.reduce((sum, cook) => sum + cook.waits, 0),
    servedByHuman: human ? state.log.filter((event) => HANDED.has(event.type) && event.cook === human.id).length : 0,
    ...curveMeasures(state, come, served),
    ...(state.setup.unattended ? { burnt: state.burnt } : {}),
    ...tallyMeasures(state),
    ...tableMeasures(state),
    ...supplyMeasures(state),
    ...deliveryMeasures(state),
    ...miseMeasures(state),
  };
}
