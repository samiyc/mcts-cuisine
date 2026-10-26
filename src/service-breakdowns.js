import { createRng } from "mcts-commun/random.js";
import { holdHere } from "./service-legs.js";

/**
 * The robots' breakdowns (Sami, 26/10/2026, the evening; docs/recherche/production.md): a robot stops `repair` turns,
 * at turns drawn for each robot, one every `every` turns on average (1 % of the time stopped: the only published
 * figure is a maker's « 99 % uptime »). Stopped, it does nothing: a gesture under way waits (it ends `repair` turns
 * later), a robot on its way stays where it is (and looks again for its station once repaired), its station stays
 * held, its pot cooks on. The robots do not know when the next breakdown comes: the search draws them again in its
 * worlds. `setup.breakdowns`, off by default; the figures are hypotheses (questions-specialiste.md, 24).
 */
export const BREAKDOWNS = Object.freeze({ every: 1000, repair: 10 });

/** The breakdowns of the robots `ids` from turn `t` to the service's end, drawn by `rng`: `{ robot, at }`, by turn. */
function drawBreakdowns(setup, ids, rng, t = 0) {
  const { every } = setup.breakdowns;
  const gap = () => Math.max(1, Math.round(-every * Math.log(1 - rng.next())));
  const all = ids.flatMap((robot) => {
    const times = [];
    for (let at = t + gap(); at < setup.service; at += gap()) times.push({ robot, at });
    return times;
  });
  return all.sort((a, b) => a.at - b.at);
}

/** The breakdowns of a service; null without the setting. */
export function breakdownsOf(setup, cooks, seed) {
  if (!setup.breakdowns) return null;
  const ids = cooks.filter((cook) => cook.kind === "robot").map((cook) => cook.id);
  return { next: drawBreakdowns(setup, ids, createRng(seed + 419)), count: 0, turns: 0 };
}

/** `state`'s breakdowns for a world of the search: those to come drawn again from now by `rng`. */
export function redrawBreakdowns(state, rng) {
  if (!state.breakdowns) return null;
  const ids = state.cooks.filter((cook) => cook.kind === "robot").map((cook) => cook.id);
  return { ...state.breakdowns, next: drawBreakdowns(state.setup, ids, rng, state.t) };
}

/** Is `cook` stopped now? */
export const isBroken = (state, cook) => (cook.brokenUntil ?? 0) > state.t;

/** At the start of a turn: the robots whose breakdown is due stop. */
export function breakdownTurn(state) {
  const { breakdowns } = state;
  if (!breakdowns) return;
  while (breakdowns.next.length && breakdowns.next[0].at <= state.t) stop(state, breakdowns.next.shift().robot);
}

/** Robot `id` stops `repair` turns: its gesture waits, its way stops where it is. */
function stop(state, id) {
  const cook = state.cooks.find((one) => one.id === id);
  if (isBroken(state, cook)) return;
  const { repair } = state.setup.breakdowns;
  cook.brokenUntil = state.t + repair;
  if (cook.phase === "working") cook.until += repair;
  if (cook.phase === "moving") cook.path = holdHere(state, cook);
  state.breakdowns.count += 1;
  state.breakdowns.turns += repair;
  state.log.push({ t: state.t, type: "broken", cook: id, turns: repair });
}

/** The breakdowns' measures: how many, and the turns robots were stopped. */
export const breakdownMeasures = (state) => (state.breakdowns ? { breakdowns: state.breakdowns.count, brokenTurns: state.breakdowns.turns } : {});
