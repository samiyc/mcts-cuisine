import { STATIONS } from "../src/kitchen.js";
import { RECIPES } from "../src/kitchens.js";
import { stepsOf } from "../src/simulate.js";

/**
 * What the page shows of a service, pure and tested under Node (tests/view.test.js): the cells and stations to
 * draw, the cooks with what they do, the orders with their time left, the service in one line. The DOM layer
 * (app.js) only draws it.
 */
const STEP_LABELS = Object.freeze({ fetch: "prend l'ingrédient", cut: "coupe", cook: "fait cuire", serve: "sert" });

/** Every cell to draw: `{ x, y, kind }`, kind floor, counter or a station's letter; a busy board or stove with its progress. */
export function cellsOf(state) {
  const { plan } = state.kitchen;
  const busy = new Map();
  for (const cook of state.cooks) {
    if (cook.phase !== "working" || !cook.station) continue;
    const order = state.upcoming.find((one) => one.id === cook.order);
    const turns = stepsOf(order.recipe)[cook.step].turns;
    busy.set(`${cook.station.x},${cook.station.y}`, 1 - (cook.until - state.t) / turns);
  }
  const cells = [];
  for (let y = 0; y < plan.height; y += 1) {
    for (let x = 0; x < plan.width; x += 1) {
      const char = plan.at(x, y);
      const kind = STATIONS[char] ? char : state.kitchen.floor(char) ? "floor" : "counter";
      cells.push({ x, y, kind, progress: busy.get(`${x},${y}`) ?? null, label: STATIONS[char] ?? null });
    }
  }
  return cells;
}

/** The cooks: where they are, robot or human, what they do and for which order. */
export function cooksOf(state) {
  return state.cooks.map((cook) => {
    const order = state.upcoming.find((one) => one.id === cook.order);
    const step = order ? stepsOf(order.recipe)[cook.step] : null;
    const who = cook.kind === "human" ? "Le cuisinier" : `Robot ${cook.id}`;
    const doing = order ? `${STEP_LABELS[step.type]} (commande ${order.id}, ${RECIPES[order.recipe].label})` : "libre";
    return { id: cook.id, kind: cook.kind, x: cook.x, y: cook.y, holding: order && cook.step > 0 ? order.recipe : null, label: `${who} : ${doing}`, ahead: cook.target ? (cook.path ?? []).filter((one) => one.t >= state.t) : [] };
  });
}

/** The orders come so far, the latest first: dish, time left before the deadline, and where they stand. */
export function ordersOf(state) {
  return state.upcoming
    .filter((order) => order.arrival <= state.t)
    .map((order) => {
      const cook = state.cooks.find((one) => one.id === order.cook);
      const who = cook ? (cook.kind === "human" ? "le cuisinier" : `robot ${cook.id}`) : null;
      const left = order.deadline - state.t;
      let status = `en attente, ${left} tours`;
      if (order.status === "served") status = order.servedAt <= order.deadline ? `servie à temps (tour ${order.servedAt})` : `servie en retard (tour ${order.servedAt})`;
      else if (order.status === "taken") status = `${who}, ${left >= 0 ? `${left} tours` : `${-left} tours de retard`}`;
      else if (left < 0) status = `en attente, ${-left} tours de retard`;
      return { id: order.id, dish: RECIPES[order.recipe].label, recipe: order.recipe, status, late: order.status !== "served" && left < 0, served: order.status === "served" };
    })
    .reverse();
}

/** The service in one line. */
export function statusLine(state, measures) {
  const served = state.upcoming.filter((order) => order.status === "served");
  const onTime = served.filter((order) => order.servedAt <= order.deadline).length;
  const come = state.upcoming.filter((order) => order.arrival <= state.t).length;
  const parts = [`Tour ${state.t} / ${state.setup.service}`, `${come} commandes`, `${onTime} servies à temps`, `${served.length - onTime} en retard`];
  if (measures) parts.push(`${measures.missed} pas servies`, `${Math.round(measures.meanServe)} tours en moyenne de la commande à la table`);
  return parts.join(" · ");
}
