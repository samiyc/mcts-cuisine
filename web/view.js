import { STATIONS } from "../src/kitchen.js";
import { RECIPES } from "../src/kitchens.js";

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
const stageOf = (order, step) => (step?.type === "cut" ? "whole" : order.cooked || RECIPES[order.recipe].cook === 0 || READY_STEPS.has(step?.type) ? "ready" : "cut");
const ROLE_LABELS = Object.freeze({ coupe: "coupe", cuisson: "cuisson", salade: "salades", passe: "passe" });

/**
 * Every cell to draw: `{ x, y, kind, progress, label, dish, stage, pot, dirty }`, kind floor, wall, counter or a
 * station's letter; a busy board or stove with its progress, a counter with the dish waiting on it (a recipe's
 * name); with unattended cooking, a stove's pot (`{ ready, left }`: done or not, turns to ready or to burning)
 * and a burnt stove to clean.
 */
export function cellsOf(state) {
  const { plan } = state.kitchen;
  const busy = new Map();
  for (const cook of state.cooks) {
    if (cook.phase !== "working" || !cook.station) continue;
    const turns = cook.span ?? cook.steps[cook.step].turns;
    busy.set(`${cook.station.x},${cook.station.y}`, 1 - (cook.until - state.t) / turns);
  }
  const burn = state.setup.unattended?.burn ?? 0;
  const pots = new Map([...(state.pots ?? [])].map(([key, pot]) => [key, state.t < pot.ready ? { ready: false, left: pot.ready - state.t } : { ready: true, left: pot.ready + burn - state.t }]));
  // A pot cooking alone: its progress on the stove.
  for (const [key, pot] of state.pots ?? []) {
    if (state.t < pot.ready && !busy.has(key)) busy.set(key, 1 - (pot.ready - state.t) / RECIPES[state.upcoming.find((order) => order.id === pot.order).recipe].cook);
  }
  const dishes = new Map([...state.shelf].map(([key, id]) => [key, state.upcoming.find((order) => order.id === id)]));
  const cells = [];
  for (let y = 0; y < plan.height; y += 1) {
    for (let x = 0; x < plan.width; x += 1) {
      const char = plan.at(x, y);
      const key = `${x},${y}`;
      let kind = state.kitchen.floor(char) ? "floor" : "wall";
      if (STATIONS[char]) kind = char === "_" ? "counter" : char;
      cells.push({ x, y, kind, progress: busy.get(key) ?? null, label: STATIONS[char] ?? null, dish: dishes.get(key)?.recipe ?? null, stage: dishes.has(key) ? stageOf(dishes.get(key), null) : null, pot: pots.get(key) ?? null, dirty: state.dirty?.has(key) ?? false });
    }
  }
  return cells;
}

/** The cooks: where they are, robot or human, what they do and for which order, and what they carry. */
export function cooksOf(state) {
  return state.cooks.map((cook) => {
    const order = state.upcoming.find((one) => one.id === cook.order);
    const step = order ? cook.steps[cook.step] : null;
    const who = cook.kind === "human" ? "Le cuisinier" : `Robot ${cook.id}${cook.role ? ` (${ROLE_LABELS[cook.role]})` : ""}`;
    const what = order ? (order.stock ? `en avance, ${RECIPES[order.recipe].label}` : `commande ${order.id}, ${RECIPES[order.recipe].label}`) : "";
    const cleaning = !order && cook.steps?.[cook.step]?.type === "clean";
    const doing = order ? `${STEP_LABELS[step.type]} (${what})` : cleaning ? STEP_LABELS.clean : "libre";
    return {
      id: cook.id,
      kind: cook.kind,
      x: cook.x,
      y: cook.y,
      holding: order && cook.step > 0 ? order.recipe : null,
      ready: Boolean(step) && READY_STEPS.has(step.type),
      stage: order && cook.step > 0 ? stageOf(order, step) : null,
      label: `${who} : ${doing}`,
      ahead: cook.target ? (cook.path ?? []).filter((one) => one.t >= state.t) : [],
    };
  });
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
    if (!order) continue;
    const dish = RECIPES[order.recipe];
    const ready = order.cooked || dish.cook === 0;
    const what = ready ? `${dish.label} prête` : "oignons coupés";
    const need = order.stock ? "en avance, pour la prochaine commande" : ready ? "il faut le passe" : "il faut un fourneau";
    const taker = order.status === "taken" ? state.cooks.find((cook) => cook.id === order.cook) : null;
    const who = taker ? (taker.kind === "human" ? "le cuisinier" : `robot ${taker.id}`) : null;
    const name = order.stock ? "" : `commande ${order.id}, `;
    items.push({ counter, order: order.id, who, text: `Comptoir ${counter} : ${name}${what}, ${need}${who ? ` — ${who} : je prends` : ""}` });
  }
  return items;
}

/** Where an order stands, in words. */
function statusOf(state, order) {
  const cook = state.cooks.find((one) => one.id === order.cook);
  const who = cook ? (cook.kind === "human" ? "le cuisinier" : `robot ${cook.id}`) : null;
  const left = order.deadline - state.t;
  const time = left >= 0 ? `encore ${left} tours` : `${-left} tours de retard`;
  if (order.status === "served") return order.servedAt <= order.deadline ? `servie à temps (tour ${order.servedAt})` : `servie en retard (tour ${order.servedAt})`;
  if (order.status === "taken") return `${who}, ${time}`;
  if (order.status === "prepped") return `oignons coupés sur un comptoir, ${time}`;
  const pot = order.stove ? state.pots.get(order.stove) : null;
  // Done this turn, the soup is ready: the order says so at the next turn's start.
  if (order.status === "cooking" && state.t < pot.ready) return `cuit seule, prête dans ${pot.ready - state.t} tours, ${time}`;
  if (order.status === "cooking" || order.status === "ready") return `prête sur le feu, brûle dans ${pot.ready + state.setup.unattended.burn - state.t} tours, ${time}`;
  if (order.burnt) return `brûlée, à refaire, ${time}`;
  return `personne, ${time}`;
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

/** The service in one line. */
export function statusLine(state, measures) {
  const served = state.upcoming.filter((order) => order.status === "served");
  const onTime = served.filter((order) => order.servedAt <= order.deadline).length;
  const come = state.upcoming.filter((order) => order.arrival <= state.t).length;
  const parts = [`Tour ${state.t} / ${state.setup.service}`, `${come} commandes`, `${onTime} servies à temps`, `${served.length - onTime} en retard`];
  if (state.burnt > 0) parts.push(`${state.burnt} soupe${state.burnt > 1 ? "s" : ""} brûlée${state.burnt > 1 ? "s" : ""}`);
  if (state.shelf.size > 0) parts.push(`${state.shelf.size} comptoir${state.shelf.size > 1 ? "s" : ""} garni${state.shelf.size > 1 ? "s" : ""}`);
  if (measures) parts.push(`${measures.missed} pas servies`, `${Math.round(measures.meanServe)} tours en moyenne de la commande à la table`);
  return parts.join(" · ");
}
