import { RECIPES } from "../src/kitchens.js";
import { el, svg } from "./dom.js";
import { boardOf, cellsOf, cooksOf, ordersOf } from "./view.js";

/**
 * The kitchen drawn (split from app.js, 26/10/2026): the plan with its stations, the dishes and pots on them, the
 * cooks and where they go; beside it, the orders, the legend and the counters' board of requests.
 */
const CELL = 36;
const SYMBOLS = { o: "🧅", t: "🍅", C: "🔪", P: "🔥", S: "🛎" };
const plural = (count) => (count > 1 ? "s" : "");

/**
 * What a dish looks like where it is, at its stage: the ingredient whole (🧅, 🍅), cut with a small knife on it
 * (no emoji for cut onions: 🧅 and 🔪), or the dish (🍲, 🥗). `at`: `{ x, y }`.
 */
function itemMarks(recipe, stage, at, kind) {
  const { x, y } = at;
  if (stage === "ready") return [svg("text", { x, y, class: kind }, RECIPES[recipe].emoji)];
  const marks = [svg("text", { x, y, class: kind }, SYMBOLS[RECIPES[recipe].ingredient])];
  const held = kind === "held";
  if (stage === "cut") marks.push(svg("text", { x: x + (held ? 11 : 12), y: y + (held ? 1 : 2), class: `${kind} cut-mark` }, "🔪"));
  return marks;
}

/** A pot cooking alone (🥘) or ready (🍲), with its number: turns before it is ready, then before it burns (Sami, 23/10: what are these numbers?). */
function potMarks(pot, x, y) {
  const urgent = pot.ready && pot.left <= 2;
  const flag = urgent ? " urgent" : "";
  const dish = svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 7, class: `symbol dish${pot.ready ? " ready" : ""}${flag}` }, pot.ready ? "🍲" : "🥘");
  const left = svg("text", { x: x + CELL - 4, y: y + 11, class: `pot-left${flag}` }, String(pot.left));
  left.append(svg("title", {}, pot.ready ? `prête : brûle dans ${pot.left} tour${plural(pot.left)}` : `cuit : prête dans ${pot.left} tour${plural(pot.left)}`));
  return [dish, left];
}

/** What lies on a cell at `x`, `y`: a dish waiting, a pot cooking or ready, a burnt stove to clean. */
function onTop(cell, x, y) {
  const marks = cell.dish ? itemMarks(cell.dish, cell.stage, { x: x + CELL / 2, y: y + CELL / 2 + 7 }, "symbol dish") : [];
  if (cell.pot) marks.push(...potMarks(cell.pot, x, y));
  else if (cell.dirty) marks.push(svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 7, class: "symbol dish" }, "🧽"));
  return marks;
}

/** One cell of the plan, and what is on it: a station's symbol, a dish, a pot or a stove to clean, a gesture's progress. */
function cellMarks(cell) {
  const x = cell.x * CELL;
  const y = cell.y * CELL;
  const kind = ["floor", "wall", "counter"].includes(cell.kind) ? cell.kind : "station";
  const tile = svg("rect", { x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2, rx: 5, class: `cell ${kind}` });
  if (cell.label) tile.append(svg("title", {}, cell.label));
  const marks = [tile];
  if (cell.label && SYMBOLS[cell.kind]) marks.push(svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 6, class: "symbol" }, SYMBOLS[cell.kind]));
  marks.push(...onTop(cell, x, y));
  if (cell.progress !== null) marks.push(svg("rect", { x: x + 4, y: y + CELL - 8, width: (CELL - 8) * cell.progress, height: 4, rx: 2, class: "progress" }));
  return marks;
}

/** A cook: a circle for a robot, a square for the human, its number, what it carries. */
function cookMark(cook) {
  const group = svg("g", { class: `cook ${cook.kind} c${cook.id}`, transform: `translate(${cook.x * CELL + CELL / 2} ${cook.y * CELL + CELL / 2})` });
  const human = cook.kind === "human";
  const shape = human ? svg("rect", { x: -CELL / 2 + 5, y: -CELL / 2 + 5, width: CELL - 10, height: CELL - 10, rx: 4 }) : svg("circle", { r: CELL / 2 - 5 });
  group.append(svg("title", {}, cook.label), shape, svg("text", { y: 4, class: "cook-id" }, human ? "H" : String(cook.id)));
  if (cook.holding) group.append(...itemMarks(cook.holding, cook.stage, { x: 9, y: -7 }, "held"));
  return group;
}

const trail = (cook) => svg("polyline", { points: cook.ahead.map((one) => `${one.x * CELL + CELL / 2},${one.y * CELL + CELL / 2}`).join(" "), class: `trail ${cook.kind} c${cook.id}` });

/** The plan of `service`, its cooks and their paths ahead. */
export function board(service) {
  const { plan } = service.kitchen;
  const map = svg("svg", { viewBox: `0 0 ${plan.width * CELL} ${plan.height * CELL}`, class: "board", role: "img", "aria-label": "La cuisine, ses postes et les cuisiniers" });
  for (const cell of cellsOf(service)) map.append(...cellMarks(cell));
  const cooks = cooksOf(service);
  for (const cook of cooks) if (cook.ahead.length > 1) map.append(trail(cook));
  for (const cook of cooks) map.append(cookMark(cook));
  return el("div", { class: "board-wrap" }, map);
}

/** How much patience an order has left, as a colour of its bar. */
function levelOf(patience) {
  if (patience > 0.5) return "ok";
  return patience > 0.2 ? "warn" : "out";
}

/** A table's number, or the turn a banquet's course goes out. */
function tableLabel(order) {
  if (order.courier) return ` · coursier annoncé au tour ${order.sendAt}`;
  if (order.sendAt !== null) return ` · envoi au tour ${order.sendAt}`;
  return order.table === null ? "" : ` · table ${order.table}`;
}

/** An order: its dish's emoji and colour, its age, a patience bar (full when it comes, empty at its deadline), where it stands. */
function orderItem(order) {
  const bar = order.patience === null ? null : el("span", { class: `patience ${levelOf(order.patience)}`, role: "meter", "aria-label": "patience restante", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(100 * order.patience)) }, el("span", { style: `width:${(100 * order.patience).toFixed(1)}%` }));
  const table = tableLabel(order);
  const head = el("span", { class: "order-head" }, el("strong", {}, `${order.id}. ${order.dish}${table}`), el("span", { class: "age" }, `il y a ${order.age} tours`));
  return el("li", { class: `order ${order.recipe}${order.served ? " served" : ""}${order.late ? " late" : ""}` }, el("span", { class: "dish", "aria-hidden": "true" }, order.emoji), el("span", { class: "order-body" }, head, bar, el("span", { class: "order-status" }, order.status)));
}

/** The counters as a board of requests: what waits there, what it needs, who comes for it. */
function counterBoard(service) {
  const items = boardOf(service);
  if (items.length === 0) return null;
  return el("div", { class: "board-requests" }, el("h2", {}, "Le tableau des comptoirs"), el("ul", { class: "requests" }, ...items.map((item) => el("li", { class: item.who ? "taken" : null }, item.text))));
}

export function legend() {
  return el("p", { class: "hint legend" }, ...Object.entries(RECIPES).map(([name, recipe]) => el("span", { class: `legend-item ${name}` }, `${recipe.emoji} ${recipe.label}`)), " · 🧅 entier, 🧅🔪 coupé · la barre : la patience du client, pleine à la commande, vide à l'échéance · sur un fourneau, 🥘 cuit (le chiffre : tours avant qu'elle soit prête), 🍲 prête (tours avant qu'elle brûle) ; la barre verte sous un poste : le geste en cours.");
}

function orders(service) {
  const list = ordersOf(service);
  if (list.length === 0) return el("p", { class: "hint" }, "Pas encore de commande.");
  return el("ol", { class: "orders" }, ...list.map(orderItem));
}

/** The service on show: the plan, and beside it the orders and the counters. */
export const kitchenView = (service) => el("div", { class: "service-layout" }, board(service), el("div", { class: "orders-panel" }, el("h2", {}, "Les commandes"), legend(), orders(service), counterBoard(service)));
