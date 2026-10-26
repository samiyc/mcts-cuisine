import { createRng } from "mcts-commun/random.js";
import { FREE } from "./service-basics.js";
import { stepAside } from "./service-legs.js";

/**
 * The human's limits (Sami, 26/10/2026, the evening: the human, and the robots' breakdowns; docs/recherche/production.md):
 * - fatigue (`setup.fatigue`): after `after` turns, the simulated cook's gestures last `slower` longer;
 * - pauses (`setup.pauses`): `count` pauses a service, `length` turns each, at turns drawn between `from` and `to`; he
 *   finishes his dish first, then steps aside and stops;
 * - errors (`setup.errors`): a dish he hands over is wrong with a chance `rate`, `tired` once tired (the fatigue's
 *   `after`, or the middle of the service): the order is made again.
 * Each off by default; the chef at the keyboard has none (he is himself). The robots do not know when the human will
 * pause: the search draws his pauses again in its worlds. The figures are hypotheses (questions-specialiste.md, 21-23).
 */
export const FATIGUE = Object.freeze({ after: 100, slower: 0.1 });
export const PAUSES = Object.freeze({ count: 1, length: 10, from: 40, to: 160 });
export const ERRORS = Object.freeze({ rate: 0.02, tired: 0.04 });

/** The turns of `count` pauses, drawn by `rng` from turn `t` on, sorted. */
const drawPauses = (pauses, rng, t = 0) =>
  Array.from({ length: pauses.count }, () => pauses.from + rng.int(pauses.to - pauses.from + 1))
    .filter((at) => at >= t)
    .sort((a, b) => a - b);

/** The human's draws for a service: his pauses to come, his errors' draws; null without any limit. */
export function personOf(setup, seed) {
  if (!setup.pauses && !setup.errors) return null;
  return { pauses: setup.pauses ? drawPauses(setup.pauses, createRng(seed + 401)) : [], rng: createRng(seed + 409), paused: 0, wrong: 0 };
}

/** `state`'s human for a world of the search: the pauses not yet begun drawn again by `rng` (the robots do not know them). */
export function redrawPerson(state, rng) {
  const { person, setup, t } = state;
  if (!person) return null;
  return { ...person, pauses: setup.pauses ? drawPauses(setup.pauses, rng).filter((at) => at > t).slice(0, person.pauses.length) : [], rng: person.rng.clone() };
}

/** The simulated human, if any (not the chef at the keyboard). */
const personIn = (state) => state.cooks.find((cook) => cook.kind === "human" && !cook.manual);

/** At the start of a turn: a pause over ends; a pause due begins, once he is free (his dish finished). */
export function personTurn(state) {
  const cook = personIn(state);
  if (!cook || !state.person) return;
  if (cook.phase === "pause" && cook.until <= state.t) Object.assign(cook, { phase: "idle", until: null });
  const due = state.person.pauses[0];
  if (due === undefined || due > state.t || cook.phase !== "idle") return;
  state.person.pauses.shift();
  const { length } = state.setup.pauses;
  stepAside(state, cook);
  Object.assign(cook, { phase: "pause", until: state.t + length });
  state.person.paused += length;
  state.log.push({ t: state.t, type: "pause", cook: cook.id, turns: length });
}

/** Is the human tired now: past the fatigue's turn, or the middle of the service without fatigue set? */
const tired = (state) => state.t >= (state.setup.fatigue?.after ?? state.setup.service / 2);

/** How long a gesture of `turns` lasts for `cook`: longer for a tired human. */
export function slower(state, cook, turns) {
  const { fatigue } = state.setup;
  if (!fatigue || cook.kind !== "human" || cook.manual || state.t < fatigue.after) return turns;
  return Math.ceil(turns * (1 + fatigue.slower));
}

/** Is the dish `cook` hands over wrong? Then the order is open again, to make again, and the cook free: true. */
export function wrongDish(state, cook, order) {
  const { errors } = state.setup;
  if (!errors || !state.person || cook.kind !== "human" || cook.manual) return false;
  if (state.person.rng.next() >= (tired(state) ? errors.tired : errors.rate)) return false;
  Object.assign(order, { status: "open", cook: null, wrong: (order.wrong ?? 0) + 1 });
  Object.assign(cook, FREE);
  state.person.wrong += 1;
  state.log.push({ t: state.t, type: "wrong", cook: cook.id, order: order.id });
  return true;
}

/** The human's measures: the turns he paused, the dishes made again for his errors. */
export const personMeasures = (state) => (state.person ? { pausedTurns: state.person.paused, remade: state.person.wrong } : {});
