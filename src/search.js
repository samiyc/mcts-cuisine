import { search } from "mcts-commun/mcts.js";
import { createRng } from "mcts-commun/random.js";
import { RECIPES } from "./kitchens.js";
import { HUMANS, RULES } from "./rules.js";
import { advance, choose, cloneService } from "./simulate.js";

/**
 * The search (ISMCTS, `search` of mcts-commun) choosing which order a free robot takes. It knows what the
 * robots know: the kitchen, the orders come, who cooks what and where. What it cannot know it draws again at
 * every iteration: the orders still to come (at the service's usual pace), and the human, whose habits the
 * robots do not know (one of the three models of `HUMANS`, drawn per world, with his own draws). The robot's
 * choices are judged on common worlds, a tree of `depth` choices (this robot's, then the next free robot's),
 * the quickest-dish rule beyond, for `horizon` turns.
 *
 * `human` (a model of `HUMANS`) gives every world the human's true habits: a measure of what knowing him is
 * worth, never what the robots know.
 *
 * A world is scored against the quickest-dish rule's from the same point: ½ for as many dishes served in time
 * (a dish still in time at the horizon counts half), a dish more or less worth `1 / spread`.
 */
export const SEARCH_SETTINGS = Object.freeze({ budget: 64, depth: 2, explore: 0.3, width: 4, spread: 3, horizon: 60, seed: 1 });

/** The orders still to come, drawn again from turn `t` at the service's pace (setup's `every`), ids after `lastId`. */
function drawComing(setup, t, lastId, rng) {
  const names = Object.keys(RECIPES);
  const coming = [];
  const gap = () => Math.max(1, Math.round(-setup.every * Math.log(1 - rng.next())));
  for (let at = t + gap(); at <= setup.lastOrder; at += gap()) {
    coming.push({ id: lastId + coming.length + 1, recipe: names[rng.int(names.length)], arrival: at, deadline: at + setup.patience, status: "upcoming", cook: null, servedAt: null });
  }
  return coming;
}

/** A world consistent with what the robots know at this choice, played to `horizon` turns from now. */
export function drawWorld(state, rng, horizon = SEARCH_SETTINGS.horizon, human = null) {
  const world = cloneService(state);
  // The chef at the keyboard is played, in the worlds, by a model of a human like any other.
  for (const cook of world.cooks) cook.manual = false;
  const come = world.upcoming.filter((order) => order.arrival <= state.t);
  world.upcoming = [...come, ...drawComing(state.setup, state.t, Math.max(0, ...come.map((order) => order.id)), rng)];
  const names = Object.keys(HUMANS);
  const drawn = HUMANS[names[rng.int(names.length)]];
  world.humanRule = state.human ? (human ?? drawn) : null;
  world.rng = createRng(rng.int(2 ** 32));
  world.until = state.t + horizon;
  world.choice = advance(world, world.humanRule, world.until);
  return world;
}

/** Dishes served in time, and half of those still in time, among the orders come by now. */
export function valueOf(world) {
  let value = 0;
  for (const order of world.upcoming) {
    if (order.arrival > world.t) continue;
    if (order.status === "served") value += order.servedAt <= order.deadline ? 1 : 0;
    else if (order.deadline > world.t) value += 0.5;
  }
  return value;
}

/** The quickest-dish rule to the horizon. */
function rollOut(world) {
  while (world.choice) {
    choose(world, world.choice, RULES.quickest(world.choice.open).id);
    world.choice = advance(world, world.humanRule, world.until);
  }
  return world;
}

/** The shortlist: the quickest dish, the oldest order, the nearest crate, then the rest; `width` at most. */
function shortlistOf(world, moves, width) {
  const orders = moves.map((move) => move.order);
  const { reach } = world.choice;
  const favourites = [RULES.quickest(orders), RULES.oldest(orders), orders.reduce((best, order) => (reach(order) < reach(best) ? order : best))];
  const ranked = [...favourites.map((order) => moves.find((move) => move.order === order)), ...moves];
  return [...new Map(ranked.map((move) => [move.key, move])).values()].slice(0, width);
}

function problemFor(base, { width, spread, horizon, human }) {
  return {
    sample: (state, rng) => drawWorld(state, rng, horizon, human),
    actor: () => "robots",
    moves: (world) => world.choice.open.map((order) => ({ id: order.id, order, key: `${world.choice.cook.id}>${order.id}` })),
    shortlist: (world, moves) => shortlistOf(world, moves, width),
    key: (move) => move.key,
    play(world, move) {
      choose(world, world.choice, move.id);
      world.choice = advance(world, world.humanRule, world.until);
      return world;
    },
    over: (world) => !world.choice,
    rollout: rollOut,
    score: (world) => Math.min(1, Math.max(0, 0.5 + (valueOf(world) - base) / spread)),
  };
}

/** The quickest-dish rule's mean value over a few drawn worlds: the scores' middle. */
function baseOf(state, rng, { horizon, human }, runs = 4) {
  let total = 0;
  for (let i = 0; i < runs; i += 1) total += valueOf(rollOut(drawWorld(state, rng, horizon, human)));
  return total / runs;
}

/**
 * The search as a robots' rule (rules.js's signature, reading `context.state`): a single open order is taken
 * at once; otherwise `budget` iterations, seeded from the turn and the robot.
 */
export function searchRule(options = {}) {
  const { budget, depth, explore, width, spread, horizon, seed, human = null } = { ...SEARCH_SETTINGS, ...options };
  return (open, { state }) => {
    if (open.length === 1) return open[0];
    const robot = state.cooks[state.cursor];
    const rng = createRng((Math.imul(seed, 0x9e3779b1) + state.t * 131 + robot.id * 7 + open.length) >>> 0);
    const found = search(state, problemFor(baseOf(state, rng, { horizon, human }), { width, spread, horizon, human }), { budget, rng, depth, explore, common: true });
    return open.find((order) => order.id === found.move?.id) ?? RULES.quickest(open);
  };
}
