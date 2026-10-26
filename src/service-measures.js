import { keyOf } from "./service-basics.js";

/**
 * The measures of a service (Sami, 26/10/2026, step 0 of docs/recherche/feuille-de-route.md: the restaurants'
 * indicators, counted, deciding nothing). At the end, from the orders: the ticket time (from the order to the pass)
 * on average, at the 9th decile and at most, the worst lateness, the dishes the human served. Turn by turn, in
 * `state.tally`: the rush (« le coup de feu », the most orders open at once), how busy each station was (the busiest
 * board, stove, pass and counter: the bottleneck), and the turns cooks waited for a station, by kind. The search's
 * worlds count nothing (`tally` null): they decide, they are not measured.
 */

/** The station kinds whose use is measured, by the name a measure gives them. */
const KINDS = Object.freeze({ C: "Board", P: "Stove", S: "Pass", _: "Counter" });
const WORDS = Object.freeze({ Board: "planche", Stove: "fourneau", Pass: "passe", Counter: "comptoir" });

/**
 * The bottleneck of `measures` (one service's, or a rule's means): the station kind whose busiest station was at work
 * the most, or the one cooks waited for the most when that is more telling. `{ use: { word, share }, wait: { word, turns } }`.
 */
export function bottleneckOf(measures) {
  const names = Object.values(KINDS).filter((name) => `use${name}` in measures);
  const most = (key) => names.reduce((best, name) => (measures[`${key}${name}`] > measures[`${key}${best}`] ? name : best), names[0]);
  if (names.length === 0) return null;
  const used = most("use");
  const waited = most("wait");
  return { use: { word: WORDS[used], share: measures[`use${used}`] }, wait: { word: WORDS[waited], turns: measures[`wait${waited}`] } };
}

/** A service's counts, empty. @returns {{ turns: number, peakOpen: number, peakAt: number, busy: Map<string, number>, waitsFor: Record<string, number> }} */
export const createTally = () => ({ turns: 0, peakOpen: 0, peakAt: 0, busy: new Map(), waitsFor: {} });

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
  const open = state.upcoming.filter((order) => !order.stock && order.arrival <= state.t && order.status !== "served").length;
  if (open > tally.peakOpen) Object.assign(tally, { peakOpen: open, peakAt: state.t });
  const working = new Set(state.cooks.filter((cook) => cook.phase === "working" && cook.station && cook.until > state.t).map((cook) => keyOf(cook.station)));
  for (const station of state.kitchen.stations) {
    if (KINDS[station.kind] && atWork(state, station, working)) tally.busy.set(keyOf(station), (tally.busy.get(keyOf(station)) ?? 0) + 1);
  }
}

/** A cook waits this turn for a station of `kind`, every one taken. */
export function countWait(state, kind) {
  if (state.tally) state.tally.waitsFor[kind] = (state.tally.waitsFor[kind] ?? 0) + 1;
}

/** The value at rank `share` of the sorted `values` (nearest rank), 0 when there are none. */
const rank = (values, share) => (values.length ? values[Math.ceil(share * values.length) - 1] : 0);

/** The share of the turns the busiest station of each kind was at work, and the turns cooks waited for each kind. */
function stationMeasures(state) {
  const { tally } = state;
  const measures = {};
  for (const [kind, name] of Object.entries(KINDS)) {
    const stations = state.kitchen.stations.filter((station) => station.kind === kind);
    if (stations.length === 0) continue;
    measures[`use${name}`] = Math.max(...stations.map((station) => tally.busy.get(keyOf(station)) ?? 0)) / Math.max(1, tally.turns);
    measures[`wait${name}`] = tally.waitsFor[kind] ?? 0;
  }
  return measures;
}

/** What the turns counted say: the rush and its turn, the stations' use and the waits for them. */
const tallyMeasures = (state) => (state.tally ? { peakOpen: state.tally.peakOpen, peakAt: state.tally.peakAt, ...stationMeasures(state) } : {});

/**
 * The service's measures: orders come, served in time (the score a team should raise), served late, not
 * served by the end, the ticket time (from the order to the pass: mean, 9th decile, most), the worst lateness, the
 * cooks' moves and waits, the dishes the human served; with unattended cooking, the soups burnt; and what the turns
 * counted say.
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
    missed: come.length - served.length,
    meanServe: served.length ? served.reduce((sum, order) => sum + order.servedAt - order.arrival, 0) / served.length : 0,
    p90Serve: rank(times, 0.9),
    maxServe: rank(times, 1),
    maxLate: Math.max(0, ...served.map((order) => order.servedAt - order.deadline)),
    moves: state.cooks.reduce((sum, cook) => sum + cook.moves, 0),
    waits: state.cooks.reduce((sum, cook) => sum + cook.waits, 0),
    servedByHuman: human ? state.log.filter((event) => event.type === "served" && event.cook === human.id).length : 0,
    ...(state.setup.unattended ? { burnt: state.burnt } : {}),
    ...tallyMeasures(state),
  };
}
