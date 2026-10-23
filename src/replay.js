import { HUMANS, RULES } from "./rules.js";
import { searchRule, valueOf } from "./search.js";
import { assign, cloneService, createService, drawOrders, interact, isOver, offeredTo, steer, stepService } from "./simulate.js";

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
export function playReplay(replay, { onTurn = () => {}, onDecision = null, until = Infinity, rule: ruleOverride = null } = {}) {
  if (replay.format !== REPLAY_FORMAT) throw new Error(`format de replay inconnu : ${replay.format}`);
  const state = createService(replay.setup, drawOrders(replay.seed, replay.setup), { human: null, seed: replay.seed, manual: true });
  const rule = ruleOverride ?? ruleNamed(replay.rule);
  const inputs = [...replay.inputs];
  const seen = new Map();
  const chef = state.cooks.find((cook) => cook.manual);
  while (!isOver(state) && state.t < until) {
    let said = null;
    // The chef's hands empty before his keys: if they take an order, that was a decision (\`onDecision\`).
    const before = onDecision && inputs[0]?.t === state.t && chef.order === null ? cloneService(state) : null;
    while (inputs.length && inputs[0].t === state.t) said = pressKey(state, inputs.shift().key) ?? said;
    if (before && chef.order !== null && chef.order > 0) onDecision({ t: state.t, before, chosen: chef.order });
    stepService(state, rule, HUMANS[replay.human] ?? null);
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
