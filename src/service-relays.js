import { distancesFrom } from "./kitchen.js";
import { PUT, isWorkStation, keyOf, kindDistance, orderOf, sideDistance } from "./service-basics.js";
import { packFirst } from "./service-delivery.js";
import { plateFor } from "./service-plates.js";
import { holdHere, paceOf, planLeg, stationFor, stepAt, unfitKind, waitFor } from "./service-legs.js";
import { countWait } from "./service-measures.js";

/**
 * A cook setting off for its step (split from simulate.js, 26/10/2026): handing its dish over on a counter, leaving
 * it there for someone who finishes it sooner (the relays), or taking back a station from a cook still far from it.
 */

/** Did `cook` take its onions up from a counter (helping with the cooking)? Then it cooks them: putting them back down would loop. */
const fromCounter = (cook) => cook.steps[0].type === "pickup";
/** Every stove taken and a soup ready on one: a cook with cut onions in hand puts them down to take the soup off. */
const potsInTheWay = (state, cook) => state.setup.unattended && !stationFor(state, cook, cook.steps[cook.step]) && state.upcoming.some((order) => order.status === "ready");
/** A cutting robot, its onions cut, hands them over when a counter is free: it puts them down instead of cooking. */
const handsOver = (state, cook) => cook.steps[cook.step].type === "cook" && ((cook.role === "coupe" && !fromCounter(cook)) || potsInTheWay(state, cook)) && Boolean(stationFor(state, cook, PUT));

/** Could `cook`'s dish go through a counter now: in hand once cut, its next step a stove or the pass, an order's, not relayed yet? */
function relayable(state, cook, step) {
  if (cook.step === 0 || (step.type !== "cook" && step.type !== "serve")) return false;
  const order = orderOf(state, cook);
  return !order.stock && !order.relayed;
}

/**
 * The robots that may take the dish up from a counter (the human is not commanded): a free robot, or the pass's robot
 * for a dish to serve, even busy (it comes once done); any robot when the relay is forced.
 */
const takersOf = (state, cook, step, forced) => state.cooks.filter((other) => other !== cook && other.kind === "robot" && (forced || freeHand(other) || servesAtThePass(other, step)));
/** A robot free to take a dish up: idle, its hands empty, not the dish room's. */
const freeHand = (other) => other.phase === "idle" && !other.order && other.role !== "plonge";
/** The pass's robot or the aboyeur, for a dish to serve. */
const servesAtThePass = (other, step) => (other.role === "passe" || other.role === "aboyeur") && step.type === "serve";

/**
 * How soon the dish gets to its next station through `counter` (`there` turns away, the station `ahead` beyond it)
 * when `other` takes it up; null when `other` cannot, or when it is not worth it unless forced.
 */
function latencyBy(relay, other, { counter, there, ahead }) {
  const come = sideDistance(relay.maps.get(other), counter) / relay.pace + (other.order ? 4 : 0);
  if (come === Infinity || ahead === Infinity) return null;
  const latency = Math.max(there + 1, come) + 1 + ahead;
  if (!relay.forced && (there + 1 >= relay.own || latency > relay.own + 2)) return null;
  return latency;
}

/** The best of `best` and of `counter` taken up by one of the robots: the soonest the dish gets to its next station. */
function throughCounter(state, counter, relay, best) {
  const there = sideDistance(relay.mine, counter) / relay.pace;
  if (there === Infinity) return best;
  const ahead = Math.min(...counter.access.map((cell) => kindDistance(state, distancesFrom(state.kitchen, cell), relay.step.kind))) / relay.pace;
  for (const other of relay.others) {
    const latency = latencyBy(relay, other, { counter, there, ahead });
    if (latency !== null && (!best || latency < best.latency)) best = { counter, latency };
  }
  return best;
}

/** The free counter where the dish gets soonest to its next station, or null. */
function bestCounter(state, relay) {
  let best = null;
  for (const counter of state.kitchen.stations) {
    if (counter.kind === "_" && !state.shelf.has(keyOf(counter)) && !state.claims.has(keyOf(counter))) best = throughCounter(state, counter, relay, best);
  }
  return best && keyOf(best.counter);
}

/**
 * A relay for `cook`, its dish in hand and its next step's station `kind` ahead: the free counter to leave it on,
 * or null. Forced when no station of that kind is in its reach (someone who can reach both takes it up);
 * otherwise, for a robot, when a free robot would take it from the counter and finish sooner than the cook
 * itself (counting the put, the wait for the other, the pickup), and the cook saves its own walk.
 */
function relayFor(state, cook) {
  const step = cook.steps[cook.step];
  if (!relayable(state, cook, step)) return null;
  const mine = distancesFrom(state.kitchen, cook);
  // In turns: the cells walked over the pace (service-legs.js).
  const pace = paceOf(state);
  const own = kindDistance(state, mine, step.kind) / pace;
  const forced = own === Infinity;
  // `setup.relay === false` keeps only the forced relays (a measure of what the others are worth).
  if (!forced && (cook.manual || state.setup.relay === false)) return null;
  const others = takersOf(state, cook, step, forced);
  if (others.length === 0) return null;
  return bestCounter(state, { step, mine, own, forced, others, pace, maps: new Map(others.map((other) => [other, distancesFrom(state.kitchen, other)])) });
}

/** Is `other` walking to a station it has claimed, and not played at the keyboard? */
const onItsWay = (other) => other.phase === "moving" && Boolean(other.target) && Boolean(other.station) && !other.manual;

/** Would `other`, walking to a station `cook`'s step could use, only get there after `cook` had done its work and left? */
function yieldsTo(state, other, { cook, step, distances }) {
  if (other === cook || !onItsWay(other) || unfitKind(other.station, step)) return false;
  const mine = distances.get(keyOf(other.target));
  // In steps of walking (the pace, service-legs.js): a turn of work is `pace` steps.
  const theirs = (other.path?.at(-1)?.t ?? stepAt(state)) - stepAt(state);
  return mine !== undefined && mine + (step.turns + 1) * paceOf(state) < theirs;
}

/**
 * Giving way at a station (Sami, 23/10): `cook` finds every station of its step taken by cooks still walking there.
 * One that would only get there after `cook` had done its work and left gives its place back: it stops where it
 * is and looks again next turn (it waits near the station). True when a place was given.
 */
function claimFromAfar(state, cook, step) {
  const around = { cook, step, distances: distancesFrom(state.kitchen, cook) };
  const other = state.cooks.find((one) => yieldsTo(state, one, around));
  if (!other) return false;
  if (state.claims.get(keyOf(other.station)) === other.id) state.claims.delete(keyOf(other.station));
  const here = holdHere(state, other);
  Object.assign(other, { phase: "next", station: null, target: null, path: here });
  state.log.push({ t: state.t, type: "gaveWay", cook: other.id, to: cook.id });
  return true;
}

/** `cook` leaves its dish on a relay's counter, if one is worth it: claimed now, so no other cook leaves its dish there meanwhile. */
function takeRelay(state, cook) {
  const relay = relayFor(state, cook);
  if (!relay) return;
  state.claims.set(relay, cook.id);
  const need = cook.steps[cook.step].kind === "P" ? "cook" : "serve";
  cook.steps = [...cook.steps.slice(0, cook.step), { ...PUT, at: relay }];
  Object.assign(orderOf(state, cook), { relayed: true, relayedBy: cook.id });
  state.log.push({ t: state.t, type: "relay", cook: cook.id, order: cook.order, counter: relay, need });
}

/** No clean plate to serve on: the cook waits with his dish (service-plates.js). */
function waitsForPlate(state, cook, step) {
  if (step.type !== "serve" || plateFor(state, cook)) return false;
  cook.waits += 1;
  return true;
}

/** Before setting off: a delivered dish packed first, a cut dish handed over or relayed; the step to start then. */
function stepToStart(state, cook) {
  packFirst(state, cook);
  if (handsOver(state, cook)) cook.steps = [...cook.steps.slice(0, cook.step), PUT];
  takeRelay(state, cook);
  return cook.steps[cook.step];
}

/** Sends `cook` to its current step's station; waits a turn, near it, when none is free or no path is found. */
export function startStep(state, cook) {
  const step = stepToStart(state, cook);
  if (waitsForPlate(state, cook, step)) return;
  let choice = stationFor(state, cook, step);
  if (!choice && claimFromAfar(state, cook, step)) choice = stationFor(state, cook, step);
  if (!choice || !planLeg(state, cook, choice.cell)) {
    cook.waits += 1;
    countWait(state, step.kind);
    waitFor(state, cook, step);
    return;
  }
  if (isWorkStation(step.kind) && !step.at) state.claims.set(keyOf(choice.station), cook.id);
  Object.assign(cook, { phase: "moving", station: choice.station, stalled: 0 });
}
