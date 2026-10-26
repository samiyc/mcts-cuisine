import { HUMANS, RULES } from "./rules.js";
import { searchRule, valueOf } from "./search.js";
import { assign, beginTurn, cloneService, createService, drawOrders, interact, isOver, offeredTo, steer, stepService } from "./simulate.js";

/**
 * Replays of a service played at the keyboard (Sami, 23/10/2026: to debug what he saw, and later to compare what
 * the chef did with what the search would have done). A service is deterministic once its kitchen, its seed and
 * the robots' rule are known: a replay keeps those and the keys pressed, each with the turn it was played at.
 * `{ format, kitchenId, setup, seed, rule, inputs: [{ t, key }], savedAt }`.
 *
 * Version 2 (Sami, 23/10: two turns lost before taking a soup up): a turn starts (gestures ended, soups ready, orders
 * come) before the chef's key, so a key finds the soup ready on its turn and the chef free once his gesture is done.
 * Version 1, the key first, still plays back as it was played.
 */
/** @typedef {import("./types.js").Replay} Replay */
/** @typedef {import("./types.js").Rule} Rule */
/** @typedef {import("./types.js").Service} Service */

export const REPLAY_FORMAT = "cuisine-replay/2";
export const REPLAY_FORMATS = Object.freeze(["cuisine-replay/1", REPLAY_FORMAT]);
/** Does a replay of `format` start each turn before the chef's key (version 2 on)? */
export const startsFirst = (format) => format !== "cuisine-replay/1";
export const MOVES = Object.freeze({ z: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], q: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] });

/** A replay of the service \`state\` played under \`rule\` (its name), with \`inputs\`. */
export function replayOf({ kitchenId, setup, seed, rule, inputs }) {
  return { format: REPLAY_FORMAT, kitchenId, setup, seed, rule, inputs: inputs.map(({ t, key }) => ({ t, key })), savedAt: new Date().toISOString() };
}

/** Plays \`key\` for the chef at the keyboard: E works the station beside him, the others move him. Returns what he says. */
export function pressKey(state, key) {
  return key === "e" ? interact(state) : steer(state, ...MOVES[key]);
}

/** The robots' rule of a replay, by its name. */
export const ruleNamed = (name) => (name === "search" ? searchRule() : RULES[name]);

const whoOf = (cook) => (cook.kind === "human" ? "le cuisinier" : `robot ${cook.id}`);
const beside = (cook, station) => station.access.some((cell) => cell.x === cook.x && cell.y === cook.y);

/** What looks wrong with `cook`: working past the end of its gesture, or away from its station. */
function cookAnomalies(state, cook) {
  const found = [];
  const working = cook.phase === "working";
  if (working && cook.until !== null && cook.until < state.t) found.push(`${whoOf(cook)} travaille encore, son geste devait finir au tour ${cook.until}`);
  if (working && cook.station && !beside(cook, cook.station)) found.push(`${whoOf(cook)} travaille au poste (${cook.station.x},${cook.station.y}) sans être à côté, en (${cook.x},${cook.y})`);
  return found;
}

/** Who holds a station's claim, in words. */
function holderOf(cook, id) {
  if (!cook) return `le cuisinier ${id}, absent`;
  return cook.kind === "human" ? "le cuisinier" : `le robot ${id}`;
}

/** Does `cook` work at station `key`, or walk to it? */
const worksThere = (cook, key) => Boolean(cook.station) && `${cook.station.x},${cook.station.y}` === key && (cook.phase === "working" || cook.phase === "moving");

/** The station `key`, claimed by cook `id`: wrong when that cook neither works there nor goes there, nor relays a dish there. */
function claimAnomaly(state, key, id) {
  const cook = state.cooks.find((one) => one.id === id);
  return cook && (worksThere(cook, key) || cook.steps?.[cook.step]?.at === key) ? null : `le poste (${key}) est pris par ${holderOf(cook, id)}, qui n'y travaille pas`;
}

/**
 * What looks wrong in `state` now: a cook still "working" past the end of its gesture, or away from the station it
 * works at; a station claimed by a cook that does not work there nor go there.
 */
export function anomaliesOf(state) {
  const found = state.cooks.flatMap((cook) => cookAnomalies(state, cook));
  for (const [key, id] of state.claims) {
    const anomaly = claimAnomaly(state, key, id);
    if (anomaly) found.push(anomaly);
  }
  return found;
}

/** The chef's hands empty before his keys: if they take an order, that was a decision (`onDecision`); the state before them, or null. */
function decisionBefore(state, run) {
  if (!run.onDecision || run.inputs[0]?.t !== state.t) return null;
  return run.chef.order === null ? cloneService(state) : null;
}

/** The chef's keys of this turn: what he was answered last, or null. */
function pressKeys(state, run) {
  let said = null;
  while (run.inputs.length && run.inputs[0].t === state.t) said = pressKey(state, run.inputs.shift().key) ?? said;
  return said;
}

/** One turn of a replay: the turn's start, the chef's keys, the robots. What the chef was answered, or null. */
function playTurn(state, run) {
  if (run.first) beginTurn(state, run.human);
  const before = decisionBefore(state, run);
  const said = pressKeys(state, run);
  if (before && run.chef.order > 0) run.onDecision({ t: state.t, before, chosen: run.chef.order });
  stepService(state, run.rule, run.human);
  return said;
}

/** What a replay's turns need: who starts the turn, the human's model and the robots' rule, the keys left, the chef. */
const runOf = (replay, state, { rule, onDecision }) => ({ first: startsFirst(replay.format), human: HUMANS[replay.human] ?? null, rule: rule ?? ruleNamed(replay.rule), inputs: [...replay.inputs], onDecision, chef: state.cooks.find((cook) => cook.manual) });

/**
 * What `playReplay` is told: who sees every turn, who sees the chef's decisions, the turn to stop at, another rule.
 * @typedef {{ onTurn?: (state: Service, said: string | null) => void, onDecision?: ((decision: { t: number, before: Service, chosen: number }) => void) | null, until?: number, rule?: Rule | null }} PlayOptions
 */
/** @type {PlayOptions} */
const PLAY_OPTIONS = Object.freeze({ onTurn: () => {}, onDecision: null, until: Infinity, rule: null });

/**
 * Plays `replay` again: the same service, the robots under the same rule, the keys at their turns. `onTurn(state,
 * said)` sees every turn (`said`: what the chef answered a key that turn). Returns the final state and the
 * anomalies, each with the first turn it was seen.
 * @param {Replay} replay
 * @param {PlayOptions} [options]
 * @returns {{ state: Service, anomalies: { t: number, text: string }[] }}
 */
export function playReplay(replay, options = {}) {
  const { onTurn, onDecision, until, rule } = { ...PLAY_OPTIONS, ...options };
  if (!REPLAY_FORMATS.includes(replay.format)) throw new Error(`format de replay inconnu : ${replay.format}`);
  const state = createService(replay.setup, drawOrders(replay.seed, replay.setup), { human: null, seed: replay.seed, manual: true });
  const run = runOf(replay, state, { rule, onDecision });
  const seen = new Map();
  while (!isOver(state) && state.t < until) {
    const said = playTurn(state, run);
    for (const anomaly of anomaliesOf(state)) if (!seen.has(anomaly)) seen.set(anomaly, state.t);
    onTurn(state, said);
  }
  return { state, anomalies: [...seen].map(([text, t]) => ({ t, text })) };
}

/**
 * The gaps of a service played at the keyboard (Sami, 23/10: replays to analyse the gaps). At each order the chef
 * took, every order he could have taken instead is tried, with hindsight: from the state just before, the chef
 * takes it, then plays on as a simulated human (`chef`, the most urgent by default), the robots under `rule` (the
 * quickest dish by default, for speed), the service's real orders to come, for `window` turns. Each choice is worth
 * the dishes served in time at the window's end, those still in time counted half (`valueOf`, src/search.js). The
 * chef's own choice is played the same way, so that the gap is only the choice's.
 * `{ decisions: [{ t, chosen, best, gap, options: [{ id, recipe, value }] }], agreed, gap }`.
 */
export function gapsOf(replay, { window = 60, chef = "urgent", rule = RULES.quickest } = {}) {
  const decisions = [];
  const valueAfter = (before, id) => {
    const world = cloneService(before);
    const cook = world.cooks.find((one) => one.manual);
    cook.manual = false;
    assign(world, cook, id);
    const until = Math.min(before.t + window, before.setup.service);
    while (world.t < until) stepService(world, rule, HUMANS[chef]);
    return valueOf(world);
  };
  playReplay(replay, {
    onDecision: ({ t, before, chosen }) => {
      const cook = before.cooks.find((one) => one.manual);
      const options = offeredTo(before, cook).map((order) => ({ id: order.id, recipe: order.recipe, status: order.status, value: valueAfter(before, order.id) }));
      if (!options.some((option) => option.id === chosen)) return;
      const best = options.reduce((top, option) => (option.value > top.value ? option : top));
      const mine = options.find((option) => option.id === chosen);
      decisions.push({ t, chosen, best: best.id, gap: best.value - mine.value, options });
    },
  });
  const agreed = decisions.filter((decision) => decision.gap <= 0).length;
  return { decisions, agreed, gap: decisions.reduce((sum, decision) => sum + decision.gap, 0) };
}
