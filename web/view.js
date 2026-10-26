import { STATIONS } from "../src/kitchen.js";
import { RECIPES } from "../src/kitchens.js";
import { bottleneckOf } from "../src/service-measures.js";

/**
 * What the page shows of a service, pure and tested under Node (tests/view.test.js): the cells and stations to
 * draw, the cooks with what they do, the orders with their age and patience left, the service in one line.
 * The DOM layer (app.js) only draws it.
 */
const STEP_LABELS = Object.freeze({ fetch: "prend l'ingrédient", cut: "coupe", cook: "fait cuire", serve: "sert", put: "pose les oignons coupés sur un comptoir", pickup: "reprend des oignons coupés", collect: "retire la soupe du feu", clean: "récure le fourneau brûlé" });
const READY_STEPS = new Set(["serve"]);
/**
 * What a dish looks like at its stage (Sami, 23/10): `whole` the ingredient as fetched, `cut` once cut but not
 * yet a dish (onions to cook), `ready` the dish (a salad cut, a soup cooked).
 */
function stageOf(order, step) {
  if (step?.type === "cut") return "whole";
  return order.cooked || RECIPES[order.recipe].cook === 0 || READY_STEPS.has(step?.type) ? "ready" : "cut";
}
const ROLE_LABELS = Object.freeze({ coupe: "coupe", cuisson: "cuisson", salade: "salades", passe: "passe" });
const plural = (count, word) => `${count} ${word}${count > 1 ? "s" : ""}`;

/** The progress of every busy board or stove, by "x,y": a cook's gesture, or a pot cooking alone. */
function busyOf(state) {
  const busy = new Map();
  for (const cook of state.cooks) {
    if (cook.phase !== "working" || !cook.station) continue;
    const turns = cook.span ?? cook.steps[cook.step].turns;
    busy.set(`${cook.station.x},${cook.station.y}`, 1 - (cook.until - state.t) / turns);
  }
  potsCooking(state, busy);
  return busy;
}

/** A pot cooking alone: its progress on the stove, unless a cook works there. */
function potsCooking(state, busy) {
  for (const [key, pot] of state.pots ?? []) {
    if (state.t < pot.ready && !busy.has(key)) busy.set(key, 1 - (pot.ready - state.t) / RECIPES[state.upcoming.find((order) => order.id === pot.order).recipe].cook);
  }
}

/** Each pot by its stove: `{ ready, left }`, done or not, turns to ready or to burning. */
function potsOf(state) {
  const burn = state.setup.unattended?.burn ?? 0;
  const potOf = (pot) => (state.t < pot.ready ? { ready: false, left: pot.ready - state.t } : { ready: true, left: pot.ready + burn - state.t });
  return new Map([...(state.pots ?? [])].map(([key, pot]) => [key, potOf(pot)]));
}

/** What a plan's character is drawn as: floor, wall, counter, or a station's letter. */
function kindOf(state, char) {
  if (char === "_") return "counter";
  if (STATIONS[char]) return char;
  return state.kitchen.floor(char) ? "floor" : "wall";
}

/** The cell at `x`, `y`, with what `seen` (busy stations, pots, dishes on counters) says of it. */
function cellAt(state, x, y, seen) {
  const char = state.kitchen.plan.at(x, y);
  const key = `${x},${y}`;
  const dish = seen.dishes.get(key);
  return { x, y, kind: kindOf(state, char), progress: seen.busy.get(key) ?? null, label: STATIONS[char] ?? null, dish: dish ? dish.recipe : null, stage: dish ? stageOf(dish, null) : null, pot: seen.pots.get(key) ?? null, dirty: Boolean(state.dirty?.has(key)) };
}

/**
 * Every cell to draw: `{ x, y, kind, progress, label, dish, stage, pot, dirty }`, kind floor, wall, counter or a
 * station's letter; a busy board or stove with its progress, a counter with the dish waiting on it (a recipe's
 * name); with unattended cooking, a stove's pot (`{ ready, left }`: done or not, turns to ready or to burning)
 * and a burnt stove to clean.
 */
export function cellsOf(state) {
  const { plan } = state.kitchen;
  const seen = { busy: busyOf(state), pots: potsOf(state), dishes: new Map([...state.shelf].map(([key, id]) => [key, state.upcoming.find((order) => order.id === id)])) };
  const cells = [];
  for (let y = 0; y < plan.height; y += 1) for (let x = 0; x < plan.width; x += 1) cells.push(cellAt(state, x, y, seen));
  return cells;
}

/** A cook in words: the human, or a robot with its role. */
function nameOf(cook) {
  if (cook.kind === "human") return "Le cuisinier";
  return cook.role ? `Robot ${cook.id} (${ROLE_LABELS[cook.role]})` : `Robot ${cook.id}`;
}

/** What a cook does, in words: its step and its order, cleaning a stove, or nothing. */
function doingOf(cook, order, step) {
  if (!order) return cook.steps?.[cook.step]?.type === "clean" ? STEP_LABELS.clean : "libre";
  const dish = RECIPES[order.recipe].label;
  const what = order.stock ? `en avance, ${dish}` : `commande ${order.id}, ${dish}`;
  return `${STEP_LABELS[step.type]} (${what})`;
}

/** The cooks: where they are, robot or human, what they do and for which order, and what they carry. */
export function cooksOf(state) {
  return state.cooks.map((cook) => {
    const order = state.upcoming.find((one) => one.id === cook.order);
    const step = order ? cook.steps[cook.step] : null;
    const carrying = Boolean(order) && cook.step > 0;
    return {
      id: cook.id,
      kind: cook.kind,
      x: cook.x,
      y: cook.y,
      holding: carrying ? order.recipe : null,
      ready: Boolean(step) && READY_STEPS.has(step.type),
      stage: carrying ? stageOf(order, step) : null,
      label: `${nameOf(cook)} : ${doingOf(cook, order, step)}`,
      ahead: cook.target ? (cook.path ?? []).filter((one) => one.t >= state.t * (state.setup.pace ?? 1)) : [],
    };
  });
}

/** Who has taken `order`, in words, or null. */
function takerOf(state, order) {
  const cook = state.cooks.find((one) => one.id === order.cook);
  if (!cook) return null;
  return cook.kind === "human" ? "le cuisinier" : `robot ${cook.id}`;
}

/** What a dish waiting on a counter needs next. */
function needOf(order, ready) {
  if (order.stock) return "en avance, pour la prochaine commande";
  return ready ? "il faut le passe" : "il faut un fourneau";
}

/** The request of `order`, waiting on `counter`. */
function requestOf(state, counter, order) {
  const dish = RECIPES[order.recipe];
  const ready = order.cooked || dish.cook === 0;
  const what = ready ? `${dish.label} prête` : "oignons coupés";
  const who = order.status === "taken" ? takerOf(state, order) : null;
  const name = order.stock ? "" : `commande ${order.id}, `;
  const taking = who ? ` — ${who} : je prends` : "";
  return { counter, order: order.id, who, text: `Comptoir ${counter} : ${name}${what}, ${needOf(order, ready)}${taking}` };
}

/**
 * The counters read as a board of requests (Sami, 23/10): each dish waiting on one, with what it needs ("il faut
 * un fourneau", "il faut le passe") and who comes for it ("robot 2 : je prends"); a batch made ahead says it
 * waits for its order. `{ counter, order, text, who }`, in the counters' order.
 */
export function boardOf(state) {
  const items = [];
  for (const [counter, id] of state.shelf) {
    const order = state.upcoming.find((one) => one.id === id);
    if (order) items.push(requestOf(state, counter, order));
  }
  return items;
}

/** A served order, in words. */
const servedText = (order) => (order.servedAt <= order.deadline ? `servie à temps (tour ${order.servedAt})` : `servie en retard (tour ${order.servedAt})`);

/** An order on a stove, or burnt, or nobody's yet, in words, `time` its time left. */
function stoveText(state, order, time) {
  const pot = order.stove ? state.pots.get(order.stove) : null;
  // Done this turn, the soup is ready: the order says so at the next turn's start.
  if (order.status === "cooking" && state.t < pot.ready) return `cuit seule, prête dans ${pot.ready - state.t} tours, ${time}`;
  if (order.status === "cooking" || order.status === "ready") return `prête sur le feu, brûle dans ${pot.ready + state.setup.unattended.burn - state.t} tours, ${time}`;
  return order.burnt ? `brûlée, à refaire, ${time}` : `personne, ${time}`;
}

/** What a dish at the pass waits for: its table, or its banquet course's turn. */
const waitsFor = (order) => (order.sendAt === undefined ? "sa table" : `son envoi (tour ${order.sendAt})`);

/** Where an order stands, in words. */
function statusOf(state, order) {
  const left = order.deadline - state.t;
  const time = left >= 0 ? `encore ${left} tours` : `${-left} tours de retard`;
  if (order.status === "served") return servedText(order);
  if (order.status === "taken") return `${takerOf(state, order)}, ${time}`;
  if (order.status === "prepped") return `oignons coupés sur un comptoir, ${time}`;
  if (order.status === "refused") return `refusée : plus de ${RECIPES[order.recipe].label} ce soir (86)`;
  if (order.status === "passed") return `au passe depuis ${state.t - order.passedAt} tours, attend ${waitsFor(order)}, ${time}`;
  return stoveText(state, order, time);
}

/**
 * The orders come so far, the latest first: dish and its emoji, age (turns since it came), patience left (1
 * when it comes, 0 at its deadline; null once served) and where it stands.
 */
export function ordersOf(state) {
  return state.upcoming
    .filter((order) => order.arrival <= state.t)
    .map((order) => {
      const served = order.status === "served";
      const patience = order.deadline - order.arrival;
      return {
        id: order.id,
        table: order.table ?? null,
        sendAt: order.sendAt ?? null,
        dish: RECIPES[order.recipe].label,
        emoji: RECIPES[order.recipe].emoji,
        recipe: order.recipe,
        age: state.t - order.arrival,
        patience: served ? null : Math.max(0, Math.min(1, (order.deadline - state.t) / patience)),
        status: statusOf(state, order),
        late: !served && order.deadline < state.t,
        served,
      };
    })
    .reverse();
}

/**
 * The end of a service, in words (step 0 of the trades' roadmap, 26/10): the longest ticket, the rush, the dishes the
 * cook served, the bottleneck, then the dishes not served and the mean ticket time.
 */
function endOf(state, measures) {
  const neck = bottleneckOf(measures);
  const human = state.cooks.some((cook) => cook.kind === "human") ? [`le cuisinier en a servi ${measures.servedByHuman}`] : [];
  const rush = measures.peakOpen === undefined ? [] : [`coup de feu : ${measures.peakOpen} bons ouverts au tour ${measures.peakAt}`];
  const busiest = neck ? [`poste le plus occupé : ${neck.use.word} (${Math.round(100 * neck.use.share)} % des tours)`] : [];
  const tables = measures.tables === undefined ? [] : [`${measures.tablesOnTime} tables sur ${measures.tables} parties à temps`, `${measures.died} plats morts au passe`];
  const refused = measures.refused === undefined ? [] : [`${measures.refused} commandes refusées (rupture)`];
  return [`bon le plus long : ${measures.maxServe} tours`, ...rush, ...tables, ...refused, ...human, ...busiest, `${measures.missed} pas servies`, `${Math.round(measures.meanServe)} tours en moyenne de la commande à la table`];
}

/** The service in one line. */
export function statusLine(state, measures) {
  const served = state.upcoming.filter((order) => order.status === "served");
  const onTime = served.filter((order) => order.servedAt <= order.deadline).length;
  const come = state.upcoming.filter((order) => order.arrival <= state.t).length;
  const parts = [`Tour ${state.t} / ${state.setup.service}`, `${come} commandes`, `${onTime} servies à temps`, `${served.length - onTime} en retard`];
  const s = (count) => (count > 1 ? "s" : "");
  if (state.burnt > 0) parts.push(`${plural(state.burnt, "soupe")} brûlée${s(state.burnt)}`);
  if (state.shelf.size > 0) parts.push(`${plural(state.shelf.size, "comptoir")} garni${s(state.shelf.size)}`);
  if (measures) parts.push(...endOf(state, measures));
  return parts.join(" · ");
}
