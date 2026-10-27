import { RECIPES } from "./kitchens.js";
import { packFirst } from "./service-delivery.js";
import { plateFor } from "./service-plates.js";
import { useBoard } from "./service-hygiene.js";
import { PUT, collectSteps, isWorkStation, keyOf, orderOf, pickupSteps, standsOn, stepsOf } from "./service-basics.js";
import { drop, makeWay, paceOf, stepAt, turnsOf, unfit } from "./service-legs.js";
import { isOut, useSupply } from "./service-supply.js";

/**
 * The chef at the keyboard (Sami, 23/10/2026; split from simulate.js, 26/10): `steer` moves him one cell for the
 * coming turn, the robots planning again around him; `interact` works the station beside him. Both answer in words.
 */

/** What the chef is doing, in words. */
const GESTURES = Object.freeze({ fetch: "prend l'ingrédient", cut: "coupe", cook: "pose la marmite", put: "pose le plat", pickup: "reprend le plat", collect: "retire la soupe du feu", serve: "sert", clean: "récure le fourneau" });
const NAMES = Object.freeze({ o: "la caisse d'oignons", t: "la caisse de tomates", C: "une planche", P: "un fourneau", S: "le passe", _: "un comptoir", E: "le poste d'emballage", L: "la plonge" });

/**
 * The chef busy with a gesture: what it is and how long it still lasts (Sami, 23/10: « le chef travaille » stayed on
 * screen and looked like a freeze). A gesture ends at the start of the turn `until`: a key that turn still finds it.
 */
function busyText(state, cook) {
  const left = cook.until - state.t;
  const what = GESTURES[cook.steps?.[cook.step]?.type] ?? "travaille";
  if (left <= 0) return `le chef ${what} : il a fini à ce tour`;
  const plural = left > 1 ? "s" : "";
  return `le chef ${what} : encore ${left} tour${plural}`;
}

/** The cook played at the keyboard, or null. */
const manualCook = (state) => state.cooks.find((cook) => cook.manual) ?? null;

/** Why the chef cannot step from `from` onto `to` at the step after `step`, or null. */
function blockedAt(state, cook, { from, to, step }) {
  const { reservations } = state;
  if (!state.kitchen.floor(state.kitchen.plan.at(to.x, to.y))) return "un mur ou un poste";
  if (!reservations.isFree(to.x, to.y, step + 1, cook.id) || reservations.swaps(from, to, step, cook.id)) return "un robot passe là";
  return null;
}

/**
 * Where the chef steps from (the pace, Sami 26/10: `pace` cells a turn, so as many keys): after the steps he already
 * took this turn, or, those all taken (or none yet), from where he stands, a new key replacing them.
 */
function startOf(state, cook) {
  const now = stepAt(state);
  const last = cook.path?.at(-1);
  if (last && last.t > now && last.t < now + paceOf(state)) return { from: last, step: last.t, path: cook.path.filter((one) => one.t >= now) };
  return { from: { x: cook.x, y: cook.y }, step: now, path: [{ x: cook.x, y: cook.y, t: now }] };
}

/**
 * Moves the chef one cell (`dx`, `dy`) during the coming turn, if the cell is floor and nobody holds it then.
 * The robots whose path crosses his new cell later plan again around him. Returns what happened, in words.
 */
export function steer(state, dx, dy) {
  const cook = manualCook(state);
  if (!cook) return "pas de chef au clavier";
  if (cook.phase === "working") return busyText(state, cook);
  const start = startOf(state, cook);
  const to = { x: start.from.x + dx, y: start.from.y + dy };
  const blocked = blockedAt(state, cook, { from: start.from, to, step: start.step });
  if (blocked) return blocked;
  const path = [...start.path, { ...to, t: start.step + 1 }];
  state.reservations.release(cook.id);
  state.reservations.reserve(cook.id, path, { stay: true });
  Object.assign(cook, { path, target: null });
  makeWay(state, cook, to, start.step);
  return null;
}

function startWork(state, cook, station) {
  const step = cook.steps[cook.step];
  if (isWorkStation(step.kind) && !step.at) state.claims.set(keyOf(station), cook.id);
  const turns = turnsOf(state, step, station, cook);
  if (step.type === "cut") useBoard(state, station, cook);
  Object.assign(cook, { phase: "working", station, until: state.t + turns, span: turns, target: null });
}

/** The chef takes `order` and starts its first step at `station`, with `steps`. */
function takeAt(state, cook, { order, steps, station }) {
  Object.assign(order, { status: "taken", cook: cook.id });
  Object.assign(cook, { order: order.id, steps, step: 0 });
  startWork(state, cook, station);
}

/** At the sink: a rack of dirty plates washed (service-plates.js). */
function washAt(state, cook, station) {
  const rack = Math.min(state.setup.plates.rack, state.plates.dirty);
  state.plates.dirty -= rack;
  Object.assign(cook, { steps: [{ type: "wash", kind: "L", turns: state.setup.plates.wash }], step: 0, rack });
  startWork(state, cook, station);
  return `le chef lave ${rack} assiettes (${cook.span} tours)`;
}

function cleanAt(state, cook, station) {
  Object.assign(cook, { steps: [{ type: "clean", kind: "P", turns: state.setup.unattended?.clean ?? 1 }], step: 0 });
  startWork(state, cook, station);
  return `le chef récure le fourneau brûlé (${cook.span} tours)`;
}

/** No order for the crate's dish yet: a batch made ahead, for the next one. */
function aheadAt(state, cook, station) {
  const recipe = Object.keys(RECIPES).find((name) => RECIPES[name].ingredient === station.kind);
  state.stocked = (state.stocked ?? 0) + 1;
  const order = { id: -state.stocked, recipe, arrival: Infinity, deadline: Infinity, status: "open", cook: null, servedAt: null, stock: true };
  state.upcoming.push(order);
  takeAt(state, cook, { order, steps: stepsOf(order.recipe), station });
  useSupply(state, recipe);
  const what = station.kind === "o" ? "des oignons" : "des tomates";
  return `le chef prend ${what} en avance, pour la prochaine commande`;
}

/** At a crate: the most urgent open order of its dish, or a batch made ahead; nothing from an empty crate (the 86, service-supply.js). */
function fetchAt(state, cook, station) {
  const recipe = Object.keys(RECIPES).find((name) => RECIPES[name].ingredient === station.kind);
  if (isOut(state, recipe)) return `la caisse est vide : plus de ${RECIPES[recipe].label} ce soir (86)`;
  const order = state.upcoming.filter((one) => !one.stock && one.status === "open" && RECIPES[one.recipe].ingredient === station.kind).sort((a, b) => a.deadline - b.deadline)[0];
  if (!order) return aheadAt(state, cook, station);
  Object.assign(order, { status: "taken", cook: cook.id });
  useSupply(state, recipe);
  Object.assign(cook, { order: order.id, steps: stepsOf(order.recipe), step: 0 });
  state.log.push({ t: state.t, type: "taken", cook: cook.id, order: order.id });
  startWork(state, cook, station);
  return `le chef prend la commande ${order.id} (${RECIPES[order.recipe].label})`;
}

/** At a counter holding a dish: take it up, unless a robot already comes for it. */
function pickUpAt(state, cook, station) {
  const order = state.upcoming.find((one) => one.id === state.shelf.get(keyOf(station)));
  if (order.status !== "prepped") return "un robot vient déjà le chercher";
  takeAt(state, cook, { order, steps: pickupSteps(order.counter, order.recipe, order.cooked), station });
  return order.stock ? "le chef reprend sa préparation d'avance" : `le chef reprend la commande ${order.id} sur le comptoir`;
}

/** At a stove with a pot: take the soup off once ready; a robot on its way for it gives it back to the chef, who is there (Sami, 23/10: it got there too late). */
function collectAt(state, cook, station) {
  const pot = state.pots.get(keyOf(station));
  const order = state.upcoming.find((one) => one.id === pot.order);
  if (order.status === "cooking") return `la soupe cuit encore (prête au tour ${pot.ready})`;
  const coming = order.status === "taken" ? state.cooks.find((one) => one.id === order.cook && one.phase !== "working") : null;
  if (order.status !== "ready" && !coming) return "un robot la retire déjà du feu";
  if (coming) drop(state, coming);
  takeAt(state, cook, { order, steps: collectSteps(order.stove), station });
  const by = coming ? ` (le robot ${coming.id} y allait)` : "";
  return `le chef prend la soupe de la commande ${order.id} sur le feu${by}`;
}

/** What empty hands do at a station, in order: clean a burnt stove, fetch at a crate, take up a dish on a counter, take a soup off. */
const TAKE_UPS = [
  { at: (state, key, kind) => kind === "P" && state.dirty.has(key) && !state.pots.has(key) && !state.claims.has(key), act: cleanAt },
  { at: (_state, _key, kind) => kind === "o" || kind === "t", act: fetchAt },
  { at: (state, key, kind) => kind === "_" && state.shelf.has(key), act: pickUpAt },
  { at: (state, key, kind) => kind === "P" && state.pots.has(key), act: collectAt },
  { at: (state, _key, kind) => kind === "L" && state.plates?.dirty > 0, act: washAt },
];

/** The chef, his hands empty, at the stations beside him. */
function takeUp(state, cook, here) {
  for (const station of here) {
    const found = TAKE_UPS.find((one) => one.at(state, keyOf(station), station.kind));
    if (found) return found.act(state, cook, station);
  }
  return "les mains vides : prenez un ingrédient à sa caisse, des oignons coupés sur un comptoir, une soupe prête sur le feu, ou faites la plonge";
}

/** Anything cut, cooked or not, may wait on a counter for someone else, or for an order: what the chef says, or null when no counter takes it. */
function putDownHere(state, cook, here, step) {
  if (step.type !== "cook" && step.type !== "serve") return null;
  const counter = here.find((station) => station.kind === "_" && !unfit(state, station, PUT));
  if (!counter) return null;
  cook.steps = [...cook.steps.slice(0, cook.step), PUT];
  startWork(state, cook, counter);
  const what = step.type === "cook" ? "les oignons coupés" : RECIPES[orderOf(state, cook).recipe].label;
  return `le chef pose ${what} sur le comptoir`;
}

/** Will the chef clean `station`, a burnt stove, before putting his pot on? */
const cleaningFirst = (state, step, station) => step.type === "cook" && Boolean(state.setup.unattended) && state.dirty.has(keyOf(station));

/** Why the chef cannot serve yet, or null: a batch made ahead has no order; no clean plate at the pass (service-plates.js). */
function servingBlocked(state, cook, here) {
  if (orderOf(state, cook).stock) return "pas encore de commande pour ce plat : posez-le sur un comptoir, ou attendez qu'elle arrive";
  if (here.some((one) => one.kind === "S") && !plateFor(state, cook)) return "plus d'assiette propre : il faut faire la plonge";
  return null;
}

/** The chef, a dish in hand, at the stations beside him: its next step, if one of them is the station it needs. */
function workOn(state, cook, here) {
  packFirst(state, cook);
  const step = cook.steps[cook.step];
  const put = putDownHere(state, cook, here, step);
  if (put) return put;
  const notYet = step.type === "serve" ? servingBlocked(state, cook, here) : null;
  if (notYet) return notYet;
  const station = here.find((one) => !unfit(state, one, step));
  if (!station) return here.some((one) => one.kind === step.kind) ? `${NAMES[step.kind]} est occupé` : `il faut ${NAMES[step.kind]}`;
  const cleaning = cleaningFirst(state, step, station);
  startWork(state, cook, station);
  return cleaning ? `le chef nettoie le fourneau brûlé (${state.setup.unattended.clean} tours), puis pose la marmite` : null;
}

/** The chef works the station beside him, if it is the one his dish needs now. Returns what happened, in words. */
export function interact(state) {
  const cook = manualCook(state);
  if (!cook) return "pas de chef au clavier";
  if (cook.phase === "working") return busyText(state, cook);
  const here = state.kitchen.stations.filter((station) => station.access.some((cell) => standsOn(cook, cell)));
  if (here.length === 0) return "aucun poste à portée : mettez-vous à côté";
  return cook.order ? workOn(state, cook, here) : takeUp(state, cook, here);
}
