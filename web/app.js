import { KITCHENS, RECIPES } from "../src/kitchens.js";
import { HUMAN_LABELS, HUMANS, RULE_LABELS, RULES, compareRules, summaryOf } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { createService, drawOrders, interact, isOver, measuresOf, runService, steer, stepService } from "../src/simulate.js";
import { cellsOf, cooksOf, ordersOf, statusLine } from "./view.js";

/**
 * The page: a service in the chosen kitchen, the robots under the chosen rule beside the chosen simulated
 * human, played turn by turn (or all at once), then the rules on the same 100 services. The kitchen can be
 * edited (text and service): a new kitchen is a new text. The search (src/search.js) thinks for a while at
 * each choice: its services are played turn by turn, the page breathing between two, and compared on fewer
 * services. What it shows is computed in view.js; this module only draws and listens.
 */
const CELL = 36;
const COMPARED = 100;
const COMPARED_WITH_SEARCH = 12;
const app = document.getElementById("app");
const state = { kitchenId: "petite", setup: { ...KITCHENS.petite }, rule: "quickest", human: "urgent", seed: 1, speed: 2, service: null, timer: null, compared: null, error: "", busy: "", run: 0 };
const SYMBOLS = { o: "🧅", t: "🍅", C: "🔪", P: "🔥", S: "🛎" };

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) if (value !== null && value !== false && value !== undefined) node.setAttribute(key, value === true ? "" : value);
  node.append(...children.filter((child) => child !== null && child !== undefined));
  return node;
}
function svg(tag, attrs = {}, text = null) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== null) node.textContent = text;
  return node;
}

const humanRule = () => HUMANS[state.human] ?? null;
/** The chef at the keyboard (Sami, 23/10): his next move, kept until the next turn, and what his last one did. */
const manual = () => state.human === "clavier";
const keyboard = { pending: null, message: "" };
const KEYS = Object.freeze({ z: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], q: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] });
const ruleOf = (name) => (name === "search" ? searchRule() : RULES[name]);
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));
function restart() {
  stop();
  Object.assign(state, { run: state.run + 1, busy: "" });
  state.service = createService(state.setup, drawOrders(state.seed, state.setup), { human: humanRule() ? state.human : null, seed: state.seed, manual: manual() });
  Object.assign(keyboard, { pending: null, message: manual() ? "Jouer, puis Z Q S D pour bouger le chef, E pour prendre, travailler, poser, servir." : "" });
}
function stop() {
  clearInterval(state.timer);
  state.timer = null;
}
/** One turn: the chef's pending key first, then everyone. */
function step() {
  if (manual() && keyboard.pending) {
    const key = keyboard.pending;
    keyboard.pending = null;
    const said = key === "e" ? interact(state.service) : steer(state.service, ...KEYS[key]);
    if (said) keyboard.message = said;
    else if (key === "e") keyboard.message = "";
  }
  stepService(state.service, ruleOf(state.rule), humanRule());
}

/** Plays `service` to its end, the robots under `rule`, breathing every turn; false if a newer run started meanwhile. */
async function playOut(service, rule, run, label) {
  while (!isOver(service)) {
    stepService(service, rule, humanRule());
    state.busy = `${label} : tour ${service.t} / ${service.setup.service}`;
    render();
    await breathe();
    if (run !== state.run) return false;
  }
  return true;
}

async function finish() {
  stop();
  const run = ++state.run;
  if (state.rule !== "search") {
    while (!isOver(state.service)) step();
  } else if (!(await playOut(state.service, ruleOf("search"), run, "La recherche réfléchit"))) {
    return;
  }
  state.busy = "";
  render();
}

/** The rules and the search on the same few services, breathing between two turns of the search. */
async function compareWithSearch() {
  stop();
  const run = ++state.run;
  const human = humanRule();
  const runs = { ...Object.fromEntries(Object.keys(RULES).map((name) => [name, []])), search: [] };
  for (let i = 0; i < COMPARED_WITH_SEARCH; i += 1) {
    for (const [name, rule] of Object.entries(RULES)) runs[name].push(runService(state.setup, state.seed + i, rule, human, state.human).measures);
    const service = createService(state.setup, drawOrders(state.seed + i, state.setup), { human: human ? state.human : null, seed: state.seed + i });
    if (!(await playOut(service, ruleOf("search"), run, `Comparaison, service ${i + 1} sur ${COMPARED_WITH_SEARCH}`))) return;
    runs.search.push(measuresOf(service));
  }
  Object.assign(state, { compared: { services: COMPARED_WITH_SEARCH, rows: summaryOf(runs) }, busy: "" });
  render();
}
function play() {
  stop();
  state.timer = setInterval(() => {
    if (isOver(state.service)) stop();
    else step();
    render();
  }, 1000 / state.speed);
}

function select(name, options, current) {
  return el("select", { "data-knob": name }, ...options.map(([value, label]) => el("option", { value, selected: value === current }, label)));
}

function controls() {
  const playing = state.timer !== null;
  return el(
    "div",
    { class: "controls" },
    el("label", {}, "Cuisine", select("kitchen", Object.entries(KITCHENS).map(([id, kitchen]) => [id, kitchen.label]), state.kitchenId)),
    el("label", {}, "Les robots prennent", select("rule", Object.entries(RULE_LABELS), state.rule)),
    el("label", {}, "Le cuisinier", select("human", Object.entries(HUMAN_LABELS), state.human)),
    el("label", {}, "Service n°", el("input", { type: "number", min: "1", value: String(state.seed), "data-knob": "seed", inputmode: "numeric" })),
    el("label", {}, "Vitesse", select("speed", [["0.5", "très lente (2 s par tour)"], ["1", "lente (1 s par tour)"], ["2", "2 tours par seconde"], ["4", "normale (4 tours par s)"], ["10", "rapide (10 tours par s)"]], String(state.speed))),
    el("button", { type: "button", "data-action": playing ? "pause" : "play" }, playing ? "Pause" : "Jouer"),
    el("button", { type: "button", class: "quiet", "data-action": "step" }, "Un tour"),
    el("button", { type: "button", class: "quiet", "data-action": "finish" }, "Jusqu'au bout"),
    el("button", { type: "button", class: "quiet", "data-action": "restart" }, "Recommencer"),
    el("button", { type: "button", class: "quiet", "data-action": "next" }, "Service suivant"),
  );
}

function board() {
  const { plan } = state.service.kitchen;
  const map = svg("svg", { viewBox: `0 0 ${plan.width * CELL} ${plan.height * CELL}`, class: "board", role: "img", "aria-label": "La cuisine, ses postes et les cuisiniers" });
  for (const cell of cellsOf(state.service)) {
    const x = cell.x * CELL;
    const y = cell.y * CELL;
    const kind = ["floor", "wall", "counter"].includes(cell.kind) ? cell.kind : "station";
    const tile = svg("rect", { x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2, rx: 5, class: `cell ${kind}` });
    if (cell.label) tile.append(svg("title", {}, cell.label));
    map.append(tile);
    if (cell.label && SYMBOLS[cell.kind]) map.append(svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 6, class: "symbol" }, SYMBOLS[cell.kind]));
    if (cell.dish) map.append(svg("text", { x: x + CELL / 2, y: y + CELL / 2 + 7, class: "symbol dish" }, SYMBOLS[RECIPES[cell.dish].ingredient]));
    if (cell.progress !== null) map.append(svg("rect", { x: x + 4, y: y + CELL - 8, width: (CELL - 8) * cell.progress, height: 4, rx: 2, class: "progress" }));
  }
  const cooks = cooksOf(state.service);
  for (const cook of cooks) if (cook.ahead.length > 1) map.append(svg("polyline", { points: cook.ahead.map((one) => `${one.x * CELL + CELL / 2},${one.y * CELL + CELL / 2}`).join(" "), class: `trail ${cook.kind} c${cook.id}` }));
  for (const cook of cooks) {
    const group = svg("g", { class: `cook ${cook.kind} c${cook.id}`, transform: `translate(${cook.x * CELL + CELL / 2} ${cook.y * CELL + CELL / 2})` });
    const shape = cook.kind === "human" ? svg("rect", { x: -CELL / 2 + 5, y: -CELL / 2 + 5, width: CELL - 10, height: CELL - 10, rx: 4 }) : svg("circle", { r: CELL / 2 - 5 });
    group.append(svg("title", {}, cook.label), shape, svg("text", { y: 4, class: "cook-id" }, cook.kind === "human" ? "H" : String(cook.id)));
    if (cook.holding) group.append(svg("text", { x: 9, y: -7, class: "held" }, cook.ready ? RECIPES[cook.holding].emoji : SYMBOLS[RECIPES[cook.holding].ingredient]));
    map.append(group);
  }
  return el("div", { class: "board-wrap" }, map);
}

/** An order: its dish's emoji and colour, its age, a patience bar (full when it comes, empty at its deadline), where it stands. */
function orderItem(order) {
  const level = order.patience === null ? "" : order.patience > 0.5 ? "ok" : order.patience > 0.2 ? "warn" : "out";
  const bar = order.patience === null ? null : el("span", { class: `patience ${level}`, role: "meter", "aria-label": "patience restante", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(100 * order.patience)) }, el("span", { style: `width:${(100 * order.patience).toFixed(1)}%` }));
  return el(
    "li",
    { class: `order ${order.recipe}${order.served ? " served" : ""}${order.late ? " late" : ""}` },
    el("span", { class: "dish", "aria-hidden": "true" }, order.emoji),
    el("span", { class: "order-body" }, el("span", { class: "order-head" }, el("strong", {}, `${order.id}. ${order.dish}`), el("span", { class: "age" }, `il y a ${order.age} tours`)), bar, el("span", { class: "order-status" }, order.status)),
  );
}

function legend() {
  return el("p", { class: "hint legend" }, ...Object.entries(RECIPES).map(([name, recipe]) => el("span", { class: `legend-item ${name}` }, `${recipe.emoji} ${recipe.label}`)), " · la barre : la patience du client, pleine à la commande, vide à l'échéance.");
}

function orders() {
  const list = ordersOf(state.service);
  if (list.length === 0) return el("p", { class: "hint" }, "Pas encore de commande.");
  return el("ol", { class: "orders" }, ...list.map(orderItem));
}

function editor() {
  const { setup } = state;
  const field = (label, name, value) => el("label", {}, label, el("input", { name, type: "number", min: "1", value: String(value) }));
  return el(
    "details",
    { class: "editor" },
    el("summary", {}, "Changer de cuisine"),
    el("p", { class: "hint" }, "Le plan en texte : « . » le sol, « R » un robot, « H » le cuisinier, « # » un mur, « _ » un comptoir où des oignons coupés attendent la cuisson (un lot par comptoir), quand les robots ont des rôles, « o » et « t » les caisses d'oignons et de tomates, « C » une planche, « P » un fourneau, « S » le passe."),
    el("form", { "data-form": "kitchen" }, el("textarea", { name: "text", rows: String(setup.text.split("\n").length + 1), spellcheck: "false" }, setup.text), el("div", { class: "fields" }, field("Une commande tous les (tours)", "every", setup.every), field("Patience d'un client (tours)", "patience", setup.patience), field("Dernière commande (tour)", "lastOrder", setup.lastOrder), field("Fin du service (tour)", "service", setup.service), el("label", {}, "Rôles des robots", el("input", { name: "roles", value: (setup.roles ?? []).map((role) => role || "-").join(" "), placeholder: "coupe cuisson", title: "Un mot par robot, dans l'ordre du plan : coupe, cuisson, salade, ou - pour un robot qui fait tout" }))), el("button", { type: "submit" }, "Appliquer")),
    state.error ? el("p", { class: "error", role: "alert" }, state.error) : null,
  );
}

function comparison() {
  const buttons = el(
    "div",
    { class: "controls" },
    el("button", { type: "button", class: "quiet compare", "data-action": "compare" }, `Comparer les règles des robots sur ${COMPARED} services`),
    el("button", { type: "button", class: "quiet compare", "data-action": "compareSearch" }, `Comparer avec la recherche sur ${COMPARED_WITH_SEARCH} services`),
  );
  if (!state.compared) return [buttons];
  const { services, rows: compared } = state.compared;
  const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
  const rows = Object.entries(compared).map(([name, row]) => el("tr", { class: name === state.rule ? "current" : null }, el("td", {}, RULE_LABELS[name]), el("td", { class: "num" }, fixed(row.orders)), el("td", { class: "num" }, fixed(row.onTime)), el("td", { class: "num" }, fixed(row.late)), el("td", { class: "num" }, fixed(row.missed)), el("td", { class: "num" }, name === "oldest" ? "—" : `${fixed(row.gain.mean, 2)} (${fixed(row.gain.low, 2)} à ${fixed(row.gain.high, 2)})`)));
  const head = ["Les robots prennent", "commandes", "à temps", "en retard", "pas servies", "gain à temps (IC 95 %)"].map((label, i) => el("th", { class: i > 0 ? "num" : null }, label));
  return [el("h2", {}, `Sur les mêmes ${services} services, le cuisinier ${HUMAN_LABELS[state.human]}`), el("div", { class: "scroll" }, el("table", {}, el("thead", {}, el("tr", {}, ...head)), el("tbody", {}, ...rows))), buttons];
}

function render() {
  const over = isOver(state.service);
  const chef = manual() ? el("p", { class: "summary chef", "aria-live": "polite" }, `Le chef (H) : ${keyboard.message || "à vous"}`) : null;
  app.replaceChildren(controls(), el("p", { class: "summary", "aria-live": "polite" }, state.busy || statusLine(state.service, over ? measuresOf(state.service) : null)), chef, el("div", { class: "layout" }, board(), el("aside", {}, el("h2", {}, "Les commandes"), legend(), orders())), ...comparison(), editor());
}

function applyKitchen(form) {
  const data = new FormData(form);
  const number = (name) => Math.max(1, Number(data.get(name)) || 1);
  const setup = { ...state.setup, label: "Cuisine modifiée", text: String(data.get("text")).replace(/\s+$/, ""), every: number("every"), patience: number("patience"), lastOrder: number("lastOrder"), service: number("service"), roles: String(data.get("roles")).split(/\s+/).filter(Boolean).map((role) => (["coupe", "cuisson", "salade"].includes(role) ? role : null)) };
  try {
    createService(setup, []);
    Object.assign(state, { setup, error: "", compared: null });
    restart();
  } catch (error) {
    state.error = `Cuisine refusée : ${error.message}`;
  }
}

const ACTIONS = {
  play,
  pause: stop,
  step: () => {
    stop();
    if (!isOver(state.service)) step();
  },
  finish,
  restart,
  next: () => {
    state.seed += 1;
    restart();
  },
  compare: () => {
    state.run += 1;
    Object.assign(state, { compared: { services: COMPARED, rows: compareRules(state.setup, { services: COMPARED, humanName: state.human }) }, busy: "" });
  },
  compareSearch: compareWithSearch,
};

app.addEventListener("change", (event) => {
  const name = event.target.dataset?.knob;
  if (!name) return;
  if (name === "kitchen") Object.assign(state, { kitchenId: event.target.value, setup: { ...KITCHENS[event.target.value] }, error: "" });
  else if (name === "seed") state.seed = Math.max(1, Number(event.target.value) || 1);
  else if (name === "speed") state.speed = Number(event.target.value);
  else state[name] = event.target.value;
  if (name !== "speed" && name !== "rule") state.compared = null;
  if (name === "speed" && state.timer) play();
  else if (name !== "speed") restart();
  render();
});
app.addEventListener("click", (event) => {
  const action = event.target.closest?.("[data-action]")?.dataset.action;
  if (!ACTIONS[action]) return;
  ACTIONS[action]();
  render();
});
app.addEventListener("submit", (event) => {
  event.preventDefault();
  applyKitchen(event.target);
  render();
});
// The chef's keys, kept for the next turn while the service plays; a key in a form field is the field's.
document.addEventListener("keydown", (event) => {
  if (!manual() || event.target.closest?.("input, textarea, select") || event.ctrlKey || event.altKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (key !== "e" && !KEYS[key]) return;
  event.preventDefault();
  keyboard.pending = key;
  // Paused: the key plays its turn at once.
  if (!state.timer && !isOver(state.service)) {
    step();
    render();
  }
});
restart();
render();
