import { STATIONS } from "../src/kitchen.js";
import { RECIPES } from "../src/kitchens.js";

/**
 * What the page shows of a service, pure and tested under Node (tests/view.test.js): the cells and stations to
 * draw, the cooks with what they do, the orders with their age and patience left, the service in one line.
 * The DOM layer (app.js) only draws it.
 */
const STEP_LABELS = Object.freeze({ fetch: "prend l'ingrédient", cut: "coupe", cook: "fait cuire", serve: "sert", put: "pose le plat sur un comptoir", pickup: "reprend un plat posé" });
const READY_STEPS = new Set(["serve", "put"]);

/**
 * Every cell to draw: `{ x, y, kind, progress, label, dish }`, kind floor, wall, counter or a station's letter;
 * a busy board or stove with its progress, a counter with the dish waiting on it (a recipe's name).
 */
export function cellsOf(state) {
  const { plan } = state.kitchen;
  const busy = new Map();
  for (const cook of state.cooks) {
    if (cook.phase !== "working" || !cook.station) continue;
    const { turns } = cook.steps[cook.step];
    busy.set(`${cook.station.x},${cook.station.y}`, 1 - (cook.until - state.t) / turns);
  }
  const dishes = new Map([...state.shelf].map(([key, id]) => [key, state.upcoming.find((order) => order.id === id).recipe]));
  const cells = [];
  for (let y = 0; y < plan.height; y += 1) {
    for (let x = 0; x < plan.width; x += 1) {
      const char = plan.at(x, y);
      const key = `${x},${y}`;
      let kind = state.kitchen.floor(char) ? "floor" : "wall";
      if (STATIONS[char]) kind = char === "_" ? "counter" : char;
      cells.push({ x, y, kind, progress: busy.get(key) ?? null, label: STATIONS[char] ?? null, dish: dishes.get(key) ?? null });
    }
  }
  return cells;
}

/** The cooks: where they are, robot or human, what they do and for which order, and what they carry. */
export function cooksOf(state) {
  return state.cooks.map((cook) => {
    const order = state.upcoming.find((one) => one.id === cook.order);
    const step = order ? cook.steps[cook.step] : null;
    const who = cook.kind === "human" ? "Le cuisinier" : `Robot ${cook.id}`;
    const doing = order ? `${STEP_LABELS[step.type]} (commande ${order.id}, ${RECIPES[order.recipe].label})` : "libre";
    return {
      id: cook.id,
      kind: cook.kind,
      x: cook.x,
      y: cook.y,
      holding: order && cook.step > 0 ? order.recipe : null,
      ready: Boolean(step) && READY_STEPS.has(step.type),
      label: `${who} : ${doing}`,
      ahead: cook.target ? (cook.path ?? []).filter((one) => one.t >= state.t) : [],
    };
  });
}

/** Where an order stands, in words. */
function statusOf(state, order) {
  const cook = state.cooks.find((one) => one.id === order.cook);
  const who = cook ? (cook.kind === "human" ? "le cuisinier" : `robot ${cook.id}`) : null;
  const left = order.deadline - state.t;
  const time = left >= 0 ? `encore ${left} tours` : `${-left} tours de retard`;
  if (order.status === "served") return order.servedAt <= order.deadline ? `servie à temps (tour ${order.servedAt})` : `servie en retard (tour ${order.servedAt})`;
  if (order.status === "taken") return `${who}, ${time}`;
  if (order.status === "ready") return `prête sur un comptoir, ${time}`;
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
  if (state.shelf.size > 0) parts.push(`${state.shelf.size} sur un comptoir`);
  if (measures) parts.push(`${measures.missed} pas servies`, `${Math.round(measures.meanServe)} tours en moyenne de la commande à la table`);
  return parts.join(" · ");
}
