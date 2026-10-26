/**
 * The shapes the modules hand each other, for the type check (`npm run types`, tsc on the JSDoc; Sami, 26/10/2026, as
 * in mcts-urgences and mcts-entrepot): nothing runs here. A module imports one with
 * `@typedef {import("./types.js").Rule} Rule`.
 */

/** A cell of the plan. @typedef {{ x: number, y: number }} Cell */

/** A station of the kitchen (kitchen.js): where it is, its letter, the floor cells a cook works it from. @typedef {Cell & { kind: string, access: Cell[] }} Station */

/** A step of a dish (service-basics.js): its kind, the station's letter, its turns, and the counter or stove it must be (`at`, "x,y"). @typedef {{ type: string, kind: string, turns: number, at?: string }} Step */

/**
 * A cook during a service (simulate.js `createService`): a robot (with its role) or the human (`manual` at the
 * keyboard); where it is and starts from, the order and its steps, what it does (`phase`), its station and its leg
 * (`target`, `path`), when its gesture ends, and its counts.
 * @typedef {{
 *   id: number, kind: string, role: string | null, x: number, y: number, home: Cell, order: number | null,
 *   steps: Step[] | null, step: number, phase: string, station: Station | null, target: Cell | null,
 *   path: (Cell & { t: number })[] | null, until: number | null, span?: number, moves: number, waits: number,
 *   stalled: number, manual?: boolean,
 * }} Cook
 */

/**
 * An order: a dish, when it comes and its deadline; its status from `upcoming` to `served`, the cook on it, where it
 * waits (a counter, a stove), and the marks of a relay, a batch made ahead (`stock`) or a soup burnt.
 * @typedef {{
 *   id: number, recipe: string, arrival: number, deadline: number, status: string, cook: number | null,
 *   servedAt: number | null, counter?: string | null, stove?: string | null, cooked?: boolean, relayed?: boolean,
 *   relayedBy?: number, stock?: boolean, burnt?: number, table?: number, passedAt?: number | null, died?: number,
 * }} Order
 */

/** A pot cooking alone on a stove: its order, the turn it is ready, the cook who put it on. @typedef {{ order: number, ready: number, owner: number }} Pot */

/**
 * A service under way (simulate.js `createService`): the kitchen and its setup, the human's model by name, the draws,
 * the turn, the cooks and orders, the stations claimed, the dishes on the counters (`shelf`), the pots, the burnt
 * stoves, the reservations, the log, the robot whose choice comes next (`cursor`, null between turns), and what the
 * turns counted (`tally`, null in the search's worlds).
 * @typedef {{
 *   kitchen: object, setup: object, human: string | null, rng: object, t: number, cooks: Cook[], upcoming: Order[],
 *   claims: Map<string, number>, shelf: Map<string, number>, pots: Map<string, Pot>, dirty: Set<string>, burnt: number,
 *   reservations: object, log: object[], cursor: number | null, stocked?: number, replans?: number, tally: Tally | null,
 * }} Service
 */

/** A service's counts, turn by turn (service-measures.js): the turns, the rush and its turn, each station's turns at work, the waits by kind. @typedef {{ turns: number, peakOpen: number, peakAt: number, busy: Map<string, number>, waitsFor: Record<string, number> }} Tally */

/** What a rule is told at a choice: the turn, the floor distance to an order, the draws, and the service (only the search reads it). @typedef {{ t?: number, reach?: (order: Order) => number, rng?: object, state?: Service }} RuleContext */

/** A rule, or a model of the human: which of the open orders the cook takes (rules.js, search.js). @typedef {(open: Order[], context?: RuleContext) => Order} Rule */

/**
 * A service's measures (service-measures.js `measuresOf`): the dishes, the ticket times, the worst lateness, the
 * moves and waits, the human's dishes; `burnt` with unattended cooking only; the rush and the stations' use and waits
 * when the turns were counted, a station kind's only when the kitchen has one.
 * @typedef {{
 *   orders: number, onTime: number, late: number, missed: number, meanServe: number, p90Serve: number, maxServe: number,
 *   maxLate: number, moves: number, waits: number, servedByHuman: number, burnt?: number, peakOpen?: number, peakAt?: number,
 *   useBoard?: number, useStove?: number, usePass?: number, useCounter?: number, waitBoard?: number, waitStove?: number,
 *   waitPass?: number, waitCounter?: number, tables?: number, tablesOnTime?: number, died?: number, maxPass?: number,
 * }} Measures
 */

/**
 * A rule's services summed up (rules.js `summaryOf`): the mean measures, and the dishes served in time gained on the
 * oldest order first, by pairs (null without it).
 * @typedef {Omit<Measures, "moves" | "peakAt"> & { gain: { mean: number, low: number, high: number } | null }} Summary
 */

/** A replay (replay.js): the kitchen, the seed, the robots' rule, the keys with their turns. @typedef {{ format: string, kitchenId: string, setup: object, seed: number, rule: string, human?: string, inputs: { t: number, key: string }[], savedAt?: string }} Replay */

export {};
