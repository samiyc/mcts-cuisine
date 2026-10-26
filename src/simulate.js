import { createReservations } from "mcts-commun/grid.js";
import { createRng } from "mcts-commun/random.js";
import { readKitchen } from "./kitchen.js";
import { RECIPES } from "./kitchens.js";
import { ask, choiceOf, take } from "./service-choice.js";
import { letGo, move, stepAside, watch } from "./service-legs.js";
import { countTurn, createTally, measuresOf } from "./service-measures.js";
import { startStep } from "./service-relays.js";
import { refuseIfOut } from "./service-supply.js";
import { drawTables, watchPass } from "./service-tables.js";
import { adoptStock, finishWork, watchPots } from "./service-work.js";

/** @typedef {import("./types.js").Measures} Measures */
/** @typedef {import("./types.js").Rule} Rule */
/** @typedef {import("./types.js").Service} Service */

export { fitsRole, stepsOf } from "./service-basics.js";
export { interact, steer } from "./service-keys.js";
export { measuresOf } from "./service-measures.js";

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

/**
 * The parts of a service (26/10/2026, under lopin's lint budget): `service-basics.js` (a dish's steps, the roles),
 * `service-legs.js` (paths, stations, waiting, the move), `service-relays.js` (setting off, the relays),
 * `service-work.js` (work that ends, the pots), `service-choice.js` (what a cook is offered) and `service-keys.js`
 * (the chef at the keyboard). This module keeps the service itself: its start, its turn, its measures.
 */

/** The service's orders, drawn from a seed: `{ id, recipe, arrival, deadline }`, by arrival. */
export function drawOrders(seed, setup) {
  const rng = createRng(seed);
  if (setup.tables) return drawTables(setup, rng, { start: 1 + rng.int(3) });
  const orders = [];
  const names = Object.keys(RECIPES);
  for (let at = 1 + rng.int(3); at <= setup.lastOrder; at += Math.max(1, Math.round(-setup.every * Math.log(1 - rng.next())))) {
    orders.push({ id: orders.length + 1, recipe: names[rng.int(names.length)], arrival: at, deadline: at + setup.patience });
  }
  return orders;
}

/**
 * The start of a service: cooks at their places, no order yet. `human` names the human's model, or null for
 * none; `seed` draws the random human's choices and the cooks' giving way.
 * @param {object} setup
 * @param {{ id: number, recipe: string, arrival: number, deadline: number }[]} orders
 * @param {{ human?: string | null, seed?: number, manual?: boolean }} [options]
 * @returns {Service}
 */
export function createService(setup, orders, { human = "urgent", seed = 1, manual = false } = {}) {
  const kitchen = readKitchen(setup.text);
  const cook = (id, kind, at, role = null) => ({ id, kind, role, x: at.x, y: at.y, home: at, order: null, steps: null, step: 0, phase: "idle", station: null, target: null, path: null, until: null, moves: 0, waits: 0, stalled: 0 });
  const cooks = kitchen.robots.map((at, i) => cook(i + 1, "robot", at, setup.roles?.[i] || null));
  if (human || manual) cooks.push({ ...cook(cooks.length + 1, "human", kitchen.human), manual });
  const reservations = createReservations();
  // Every cook holds its place from the start: nobody plans through a cook standing still.
  for (const one of cooks) reservations.reserve(one.id, [{ x: one.x, y: one.y, t: 0 }], { stay: true });
  return { kitchen, setup, human, rng: createRng(seed + 7_919), t: 0, cooks, upcoming: orders.map((order) => ({ ...order, status: "upcoming", cook: null, servedAt: null })), claims: new Map(), shelf: new Map(), pots: new Map(), dirty: new Set(), burnt: 0, reservations, log: [], cursor: null, tally: createTally(), supply: supplyOf(setup) };
}

/** The orders `cook` may take now, as they would be offered to it (the replays' analysis, src/replay.js). */
export const offeredTo = (state, cook) => choiceOf(state, cook).open;

/** `cook` takes order `id` now, as a rule's choice would have it (the replays' analysis). */
export function assign(state, cook, id) {
  take(state, choiceOf(state, cook), id);
}

/** The crates' stock for the service (service-supply.js), its own copy; null without a rupture. */
const supplyOf = (setup) => (setup.supply ? { ...setup.supply } : null);

/** An order comes in: open, or refused when its dish is off the menu (service-supply.js). */
function open(state, order) {
  order.status = "open";
  refuseIfOut(state, order);
}

/** The start of a turn, up to the robots' choices: work ended, orders come in, the human takes his (he does not wait for the robots). */
export function beginTurn(state, human) {
  finishWork(state);
  if (state.setup.unattended) watchPots(state);
  watchPass(state);
  for (const order of state.upcoming) if (order.status === "upcoming" && order.arrival <= state.t) open(state, order);
  adoptStock(state);
  countTurn(state);
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
  letGo(state);
  for (const cook of state.cooks) if (cook.phase === "next" && !cook.manual) startStep(state, cook);
  move(state);
  state.cursor = null;
}

/**
 * Plays one turn of `state`: robots under `rule`, the human under `human` (HUMANS, rules.js).
 * @param {Service} state
 * @param {Rule} rule
 * @param {Rule | null} human
 * @returns {Service}
 */
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
    // The search's worlds decide, they are not measured.
    tally: null,
    supply: state.supply && { ...state.supply },
  };
}

/**
 * A whole service of `setup` from `seed`: robots under `rule`, the human under `human` (a model of HUMANS, rules.js,
 * named in the service by its key; null: robots alone).
 * @param {object} setup
 * @param {number} seed
 * @param {Rule} rule
 * @param {Rule | null} human
 * @returns {{ state: Service, measures: Measures }}
 */
export function runService(setup, seed, rule, human) {
  const state = createService(setup, drawOrders(seed, setup), { human: human ? human.name : null, seed });
  while (!isOver(state)) stepService(state, rule, human);
  return { state, measures: measuresOf(state) };
}
