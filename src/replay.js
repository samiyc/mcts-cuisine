import { HUMANS, RULES } from "./rules.js";
import { searchRule } from "./search.js";
import { createService, drawOrders, interact, isOver, steer, stepService } from "./simulate.js";

/**
 * Replays of a service played at the keyboard (Sami, 23/10/2026: to debug what he saw, and later to compare what
 * the chef did with what the search would have done). A service is deterministic once its kitchen, its seed and
 * the robots' rule are known: a replay keeps those and the keys pressed, each with the turn it was played at.
 * `{ format, kitchenId, setup, seed, rule, inputs: [{ t, key }], savedAt }`.
 */
export const REPLAY_FORMAT = "cuisine-replay/1";
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

/**
 * What looks wrong in \`state\` now: a cook still "working" past the end of its gesture, or away from the station it
 * works at; a station claimed by a cook that does not work there nor go there.
 */
export function anomaliesOf(state) {
  const found = [];
  const beside = (cook, station) => station.access.some((cell) => cell.x === cook.x && cell.y === cook.y);
  for (const cook of state.cooks) {
    const who = cook.kind === "human" ? "le cuisinier" : `robot ${cook.id}`;
    if (cook.phase === "working" && cook.until !== null && cook.until < state.t) found.push(`${who} travaille encore, son geste devait finir au tour ${cook.until}`);
    if (cook.phase === "working" && cook.station && !beside(cook, cook.station)) found.push(`${who} travaille au poste (${cook.station.x},${cook.station.y}) sans être à côté, en (${cook.x},${cook.y})`);
  }
  for (const [key, id] of state.claims) {
    const cook = state.cooks.find((one) => one.id === id);
    const there = cook && cook.station && `${cook.station.x},${cook.station.y}` === key && (cook.phase === "working" || cook.phase === "moving");
    const relay = cook && cook.steps?.[cook.step]?.at === key;
    if (!there && !relay) found.push(`le poste (${key}) est pris par ${cook ? (cook.kind === "human" ? "le cuisinier" : `le robot ${id}`) : `le cuisinier ${id}, absent`}, qui n'y travaille pas`);
  }
  return found;
}

/**
 * Plays \`replay\` again: the same service, the robots under the same rule, the keys at their turns. \`onTurn(state,
 * said)\` sees every turn (\`said\`: what the chef answered a key that turn). Returns the final state and the
 * anomalies, each with the first turn it was seen.
 */
export function playReplay(replay, { onTurn = () => {}, until = Infinity } = {}) {
  if (replay.format !== REPLAY_FORMAT) throw new Error(`format de replay inconnu : ${replay.format}`);
  const state = createService(replay.setup, drawOrders(replay.seed, replay.setup), { human: null, seed: replay.seed, manual: true });
  const rule = ruleNamed(replay.rule);
  const inputs = [...replay.inputs];
  const seen = new Map();
  while (!isOver(state) && state.t < until) {
    let said = null;
    while (inputs.length && inputs[0].t === state.t) said = pressKey(state, inputs.shift().key) ?? said;
    stepService(state, rule, HUMANS[replay.human] ?? null);
    for (const anomaly of anomaliesOf(state)) if (!seen.has(anomaly)) seen.set(anomaly, state.t);
    onTurn(state, said);
  }
  return { state, anomalies: [...seen].map(([text, t]) => ({ t, text })) };
}
