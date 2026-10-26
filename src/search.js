import { search } from "mcts-commun/mcts.js";
import { createRng } from "mcts-commun/random.js";
import { RECIPES } from "./kitchens.js";
import { HUMANS, RULES, humansOf } from "./rules.js";
import { redrawCouriers, withCourier } from "./service-delivery.js";
import { drawTables, firstAfter, passOf } from "./service-tables.js";
import { allergic } from "./service-hygiene.js";
import { redrawPerson } from "./service-human.js";
import { redrawBreakdowns } from "./service-breakdowns.js";

/** An order nothing more can be won on: refused (the 86), or gone with its courier. */
const LOST = new Set(["refused", "gone"]);
import { advance, choose, cloneService } from "./simulate.js";

/**
 * The search (ISMCTS, `search` of mcts-commun) choosing which order a free robot takes. It knows what the
 * robots know: the kitchen, the orders come, who cooks what and where. What it cannot know it draws again at
 * every iteration: the orders still to come (at the service's usual pace), and the human, whose habits the
 * robots do not know (one of the models of `HUMANS` the service may have, drawn per world, with his own draws). The robot's
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

/**
 * The orders still to come, drawn again from turn `t` at the service's pace (setup's `every`), ids after those `come`;
 * by tables when the service has them (service-tables.js), table numbers after theirs.
 */
function drawComing(setup, t, come, rng) {
  const lastId = Math.max(0, ...come.map((order) => order.id));
  // A banquet's orders are all known from the start: nothing to draw.
  if (setup.banquet) return [];
  if (setup.tables) return drawTables(setup, rng, { start: firstAfter(setup, rng, t), lastId, lastTable: Math.max(0, ...come.map((order) => order.table ?? 0)) }).map((order) => ({ ...order, status: "upcoming", cook: null, servedAt: null }));
  const names = Object.keys(RECIPES);
  const coming = [];
  const gap = () => Math.max(1, Math.round(-setup.every * Math.log(1 - rng.next())));
  for (let at = t + gap(); at <= setup.lastOrder; at += gap()) {
    coming.push({ id: lastId + coming.length + 1, recipe: names[rng.int(names.length)], arrival: at, deadline: at + setup.patience, status: "upcoming", cook: null, servedAt: null });
  }
  // Each with its courier, when the service delivers (service-delivery.js); some guests allergic (service-hygiene.js).
  const delivered = setup.delivery ? coming.map((order) => withCourier(order, setup.delivery, rng)) : coming;
  return setup.hygiene ? allergic(delivered, setup.hygiene, rng) : delivered;
}

/**
 * Where a world stops: `horizon` turns from now; at a banquet, not before the last course is due, as its dishes are
 * judged only when their course goes out (the night measures of 26/10: at sixty turns from the start, no course was
 * yet due, every choice was worth the same, and the search did what the quickest dish does).
 */
function untilOf(world, until) {
  if (!world.setup.banquet) return until;
  return Math.max(until, ...world.upcoming.map((order) => order.deadline));
}

/** A world consistent with what the robots know at this choice, played to `horizon` turns from now. */
export function drawWorld(state, rng, horizon = SEARCH_SETTINGS.horizon, human = null) {
  const world = cloneService(state);
  // The chef at the keyboard is played, in the worlds, by a model of a human like any other.
  for (const cook of world.cooks) cook.manual = false;
  const come = world.upcoming.filter((order) => order.arrival <= state.t || order.stock);
  world.upcoming = [...come, ...drawComing(state.setup, state.t, come, rng)];
  // The couriers not yet come: when they will come, nobody knows (service-delivery.js); nor the human's pauses, nor the
  // robots' breakdowns to come (service-human.js, service-breakdowns.js).
  redrawCouriers(world, rng);
  world.person = redrawPerson(state, rng);
  world.breakdowns = redrawBreakdowns(state, rng);
  // The humans this service may have: the one who follows his table only where there are tables.
  const names = humansOf(state.setup);
  const drawn = HUMANS[names[rng.int(names.length)]];
  // A human in the kitchen (simulated, or the chef at the keyboard, who has no model: state.human is null then)
  // is played in the worlds by a model drawn at random (Sami, 23/10: the search crashed with the chef at the keyboard).
  world.humanRule = state.human || state.cooks.some((cook) => cook.kind === "human") ? (human ?? drawn) : null;
  world.rng = createRng(rng.int(2 ** 32));
  world.until = untilOf(world, state.t + horizon);
  world.choice = advance(world, world.humanRule, world.until);
  return world;
}

/** Dishes served in time, and half of those still in time, among the orders come by now. */
export function valueOf(world) {
  let value = 0;
  for (const order of world.upcoming) {
    if (order.arrival > world.t) continue;
    if (order.status === "served") value += order.servedAt <= order.deadline ? 1 : 0;
    else if (order.deadline > world.t && !LOST.has(order.status)) value += 0.5;
  }
  return value;
}

/** The rule the worlds are played with: the quickest dish; with tables the table's (the quickest would leave the long dishes behind); at a banquet the backward planning. */
function rolloutRule(world) {
  const { open } = world.choice;
  if (world.setup.banquet || world.setup.delivery) return RULES.retro(open, { state: world });
  return world.setup.tables ? RULES.table(open, { state: world }) : RULES.quickest(open);
}

/** The quickest-dish rule (or the table's) to the horizon. */
function rollOut(world) {
  while (world.choice) {
    choose(world, world.choice, rolloutRule(world)?.id);
    world.choice = advance(world, world.humanRule, world.until);
  }
  return world;
}

/**
 * May a robot wait, in the worlds as the backward planning and the table's rule do? Wherever a dish waits at the pass
 * (tables, a banquet, couriers) and dies there if it came too early (the night measures of 26/10: without it, the
 * search never beat the backward planning at a banquet, nor the table's rule in the detour).
 */
const mayHold = (setup) => Boolean(passOf(setup));

/** The free robot's moves: each open order, and waiting when it may (`order` null). */
function movesOf(world) {
  const { cook, open } = world.choice;
  const moves = open.map((order) => ({ id: order.id, order, key: `${cook.id}>${order.id}` }));
  return mayHold(world.setup) ? [...moves, { id: undefined, order: null, key: `${cook.id}>hold` }] : moves;
}

/**
 * The shortlist: the worlds' own rule's choice (the quickest dish, or the table's, or the backward planning, which
 * may be to wait), waiting, the quickest dish, the oldest order, the nearest crate, then the rest; `width` at most.
 */
function shortlistOf(world, moves, width) {
  const { open: orders, reach } = world.choice;
  const nearest = orders.reduce((best, order) => (reach(order) < reach(best) ? order : best));
  const favourites = [rolloutRule(world) ?? null, null, RULES.quickest(orders), RULES.oldest(orders), nearest];
  const ranked = [...favourites.map((order) => moves.find((move) => move.order === order)).filter(Boolean), ...moves];
  return [...new Map(ranked.map((move) => [move.key, move])).values()].slice(0, width);
}

function problemFor(base, { width, spread, horizon, human }) {
  return {
    sample: (state, rng) => drawWorld(state, rng, horizon, human),
    actor: () => "robots",
    moves: movesOf,
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
 * at once, unless the robot may wait; otherwise `budget` iterations, seeded from the turn and the robot. Waiting
 * found best, it names no order.
 */
export function searchRule(options = {}) {
  const { budget, depth, explore, width, spread, horizon, seed, human = null } = { ...SEARCH_SETTINGS, ...options };
  return (open, { state }) => {
    if (open.length === 1 && !mayHold(state.setup)) return open[0];
    const robot = state.cooks[state.cursor];
    const rng = createRng((Math.imul(seed, 0x9e3779b1) + state.t * 131 + robot.id * 7 + open.length) >>> 0);
    const found = search(state, problemFor(baseOf(state, rng, { horizon, human }), { width, spread, horizon, human }), { budget, rng, depth, explore, common: true });
    if (found.move && found.move.order === null) return undefined;
    return open.find((order) => order.id === found.move?.id) ?? RULES.quickest(open);
  };
}
