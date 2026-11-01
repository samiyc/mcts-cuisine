import { KITCHENS } from "../../src/kitchens.js";
import { BANQUET } from "../../src/service-banquet.js";
import { DELIVERY } from "../../src/service-delivery.js";
import { MISE } from "../../src/service-mise.js";
import { PLATES } from "../../src/service-plates.js";
import { HYGIENE } from "../../src/service-hygiene.js";
import { ERRORS, FATIGUE, PAUSES } from "../../src/service-human.js";
import { BREAKDOWNS } from "../../src/service-breakdowns.js";
import { SUPPLY } from "../../src/service-supply.js";
import { TABLES } from "../../src/service-tables.js";
import { board } from "../board.js";
import { el, select } from "../dom.js";

/**
 * The tab « Cuisine » (Sami, 22/10/2026: change the kitchen to test other configurations; a tab of its own on
 * 26/10; set out in cards with switches on 1/11): a kitchen to start from and the plan's legend in the panel; in the
 * view, the plan as text beside the plan drawn, then the service and the options, grouped in as many columns as fit.
 * `ctx`: the page's `state`.
 */
/** Unattended cooking's defaults in the editor (Sami, 23/10): a ready soup burns after 6 turns, a burnt stove takes 5 to clean. */
const UNATTENDED = Object.freeze({ burn: 6, clean: 5 });
const ROLES = ["coupe", "cuisson", "salade", "passe", "aboyeur", "plonge"];
/** What each letter of the plan's text is. */
const LEGEND = [
  [".", "le sol"],
  ["R", "un robot"],
  ["H", "le cuisinier"],
  ["#", "un mur"],
  ["_", "un comptoir"],
  ["o", "des oignons"],
  ["t", "des tomates"],
  ["C", "une planche"],
  ["P", "un fourneau"],
  ["S", "le passe"],
  ["E", "l'emballage"],
  ["L", "un évier"],
];

const legendItem = ([symbol, meaning]) => el("li", {}, el("kbd", {}, symbol), meaning);

export const kitchenPanel = ({ state }) =>
  el(
    "section",
    { class: "panel" },
    el("h2", {}, "La cuisine"),
    el("label", {}, "Partir de", select("kitchen", Object.entries(KITCHENS).map(([id, kitchen]) => [id, kitchen.label]), state.kitchenId)),
    el("h3", {}, "Le plan en texte"),
    el("ul", { class: "plan-keys" }, ...LEGEND.map(legendItem)),
    el("p", { class: "hint" }, "Sur un comptoir, un plat attend qu'un autre le reprenne."),
  );

const field = (label, name, value) => el("label", {}, label, el("input", { name, type: "number", min: "1", value: String(value) }));
/** A figure that may be 0, read as a number. */
const zeroField = (label, name, value) => el("label", {}, label, el("input", { name, type: "number", min: "0", value: String(value) }));
const fields = (...children) => el("div", { class: "fields" }, ...children);
const card = (title, ...children) => el("section", { class: "card" }, el("h3", {}, title), ...children);

/**
 * An option: its switch (a checkbox for the form, `role="switch"` for a screen reader), what it does, and its figures,
 * shown only when it is on (style.css): off, they still hold what they would be if switched on.
 */
const option = (setup, name, [title, about], ...figures) =>
  el(
    "div",
    { class: "option" },
    el("label", { class: "switch" }, el("input", { name, type: "checkbox", role: "switch", checked: Boolean(setup[name]) }), el("span", { class: "switch-track" }), title),
    el("p", { class: "hint" }, about),
    figures.length ? fields(...figures) : null,
  );

/** The service's own settings: its pace of orders, the guests' patience, its length, the cooks' pace and the robots' roles. */
function serviceCard(setup) {
  const roles = el("input", { name: "roles", value: (setup.roles ?? []).map((role) => role || "-").join(" "), placeholder: "coupe cuisson", title: "Un mot par robot, dans l'ordre du plan : coupe, cuisson, salade, passe (sert ce qui est prêt), aboyeur (au passe, il annonce les plats des tables et réclame celui qui manque ; les autres robots font ce qu'il annonce), plonge (lave les assiettes, il faut un évier « L »), ou - pour un robot qui fait tout" });
  return card(
    "Le service",
    fields(
      field("Une commande tous les (tours)", "every", setup.every),
      field("Patience d'un client (tours)", "patience", setup.patience),
      field("Dernière commande (tour)", "lastOrder", setup.lastOrder),
      field("Fin du service (tour)", "service", setup.service),
      field("Cases parcourues par tour", "pace", setup.pace ?? 1),
    ),
    el("label", { class: "wide" }, "Rôles des robots, dans l'ordre du plan", roles),
    el("p", { class: "hint" }, "coupe, cuisson, salade, passe, aboyeur, plonge, ou « - » pour un robot qui fait tout."),
  );
}

/** How the orders come: tables, a banquet, delivery. */
function ordersCard(setup) {
  const tables = { ...TABLES, ...setup.tables };
  return card(
    "Les commandes",
    option(setup, "tables", ["Des tables", `${TABLES.min} à ${TABLES.max} plats, servis ensemble.`], field("Un plat attend sa table au passe (tours)", "pass", tables.pass)),
    option(setup, "banquet", ["Un banquet", `${BANQUET.covers} couverts environ, l'entrée vers le tour ${BANQUET.courses[0].at}, le plat vers le tour ${BANQUET.courses[1].at}, ${BANQUET.pass} tours au chaud au plus.`], field("Plats d'un envoi faits ensemble (coupe en série ; 1 : un par un)", "batch", setup.banquet?.batch ?? BANQUET.batch)),
    option(setup, "delivery", ["La livraison", `Un coursier par commande, annoncé ${DELIVERY.prep} tours après elle, à ${DELIVERY.spread} tours près ; il attend ${DELIVERY.wait} tours.`], zeroField("Emballer un plat (tours ; 0 : sans emballage ; il faut un poste « E »)", "packing", setup.delivery?.packing ?? 0)),
  );
}

/** The stoves and the boards: unattended cooking, the hygiene. */
function cookingCard(setup) {
  const cooking = { ...UNATTENDED, ...setup.unattended };
  return card(
    "La cuisson et l'hygiène",
    option(
      setup,
      "unattended",
      ["La soupe cuit seule", "On pose la marmite 🥘 et on repart ; prête 🍲, elle attend qu'on la retire, le chiffre dit dans combien de tours elle brûle. Brûlée, le plat est perdu, la commande à refaire, et le fourneau à nettoyer 🧽."],
      field("Elle brûle, prête, après (tours)", "burn", cooking.burn),
      field("Nettoyer un fourneau brûlé (tours)", "clean", cooking.clean),
    ),
    option(setup, "hygiene", ["L'hygiène", `Une salade sur ${Math.round(1 / HYGIENE.share)} pour un allergique à l'oignon ; une planche qui a coupé des oignons se nettoie avant (${HYGIENE.clean} tours).`], zeroField("Nettoyer chaque planche toutes les (coupes ; 0 : jamais)", "boardEvery", setup.hygiene?.every ?? HYGIENE.every)),
  );
}

/** What runs out and what is done ahead: the stock, the plates, the mise en place. */
function storesCard(setup) {
  const supply = { ...SUPPLY, ...setup.supply };
  return card(
    "Les réserves",
    option(setup, "supply", ["Un stock par caisse", "En rupture, les commandes sont refusées."], field("Oignons pour le service", "onions", supply.o), field("Tomates pour le service", "tomatoes", supply.t)),
    option(setup, "plates", ["La plonge", `Des assiettes comptées, rendues sales ${PLATES.back} tours après le plat, lavées par ${PLATES.rack} à l'évier « L ».`], field("Assiettes pour le service", "stock", setup.plates?.stock ?? PLATES.stock)),
    option(setup, "miseEnPlace", ["La mise en place", `Un robot sans commande coupe d'avance les oignons d'une soupe et les pose sur un comptoir (${MISE.ahead} au plus).`]),
  );
}

/** The limits of the simulated cook (26/10, the evening). */
const humanCard = (setup) =>
  card(
    "Le cuisinier simulé",
    option(setup, "fatigue", ["La fatigue", `Après le tour ${FATIGUE.after}, ses gestes durent ${Math.round(100 * FATIGUE.slower)} % de plus.`]),
    option(setup, "pauses", ["Les pauses", `${PAUSES.count} pause de ${PAUSES.length} tours par service, il finit son plat d'abord.`]),
    option(setup, "errors", ["Les erreurs", `${Math.round(100 * ERRORS.rate)} % de ses plats à refaire, ${Math.round(100 * ERRORS.tired)} % fatigué.`]),
  );

/** The robots' breakdowns (26/10, the evening), and the cooks crossing (28/10). */
const floorCard = (setup) =>
  card(
    "Les robots et les allées",
    option(setup, "breakdowns", ["Les pannes", `Un robot s'arrête ${BREAKDOWNS.repair} tours, une fois tous les ${BREAKDOWNS.every} tours en moyenne.`]),
    option(setup, "crossing", ["Les cuisiniers se croisent", "Plusieurs peuvent passer sur une même case d'allée ; une case d'où l'on travaille une station reste à un seul."]),
  );

/** The plan's text beside its drawing. */
const planRow = ({ setup, service }) =>
  el(
    "div",
    { class: "plan-row" },
    el("textarea", { name: "text", rows: String(setup.text.split("\n").length + 1), spellcheck: "false", wrap: "off", "aria-label": "Le plan en texte" }, setup.text),
    board(service),
  );

/** The button, and what it does or why the kitchen was refused. */
const applyRow = (error) =>
  el(
    "div",
    { class: "apply" },
    el("button", { type: "submit" }, "Appliquer"),
    error ? el("p", { class: "error", role: "alert" }, error) : el("p", { class: "hint" }, "Rien ne change avant « Appliquer » ; le service repart alors de zéro."),
  );

/** What the page last drew here: the form stays as long as neither has changed. */
let shown = null;

export function kitchenView({ state }) {
  const { setup, error } = state;
  shown = { setup, error };
  // `novalidate`: a hidden figure out of range would block the button without a word; kitchenFrom bounds them all.
  const cards = el("div", { class: "cards" }, serviceCard(setup), ordersCard(setup), cookingCard(setup), storesCard(setup), humanCard(setup), floorCard(setup));
  const form = el("form", { "data-form": "kitchen", class: "editor", novalidate: true }, planRow(state), cards, applyRow(error));
  return [el("h2", {}, setup.label ?? "Cuisine modifiée"), form];
}

/**
 * A playing service renders every turn: the form being filled stays, or a switch not yet applied would go back at the
 * next turn, and only the plan is drawn again. A plan refused stays too, to be corrected, with the reason beside the
 * button. False when the form has to be drawn: another tab, another kitchen.
 */
export function kitchenKept(root, { state }) {
  const plan = root.querySelector("[data-form=kitchen] .board-wrap");
  if (!plan || shown?.setup !== state.setup) return false;
  plan.replaceWith(board(state.service));
  if (shown.error !== state.error) root.querySelector(".apply").replaceWith(applyRow(state.error));
  shown.error = state.error;
  return true;
}

/** A whole number from the form, at least `least`. */
const wholeFrom = (data, name, least) => Math.max(least, Math.floor(Number(data.get(name))) || least);

/** Each option switched on, read from the form (`number` a field's figure, at least 1); null when off. */
const OPTIONS = {
  unattended: (number) => ({ burn: number("burn"), clean: number("clean") }),
  tables: (number) => ({ ...TABLES, pass: number("pass") }),
  supply: (number) => ({ o: number("onions"), t: number("tomatoes") }),
  banquet: (number) => ({ ...BANQUET, batch: number("batch") }),
  delivery: (_number, data) => ({ ...DELIVERY, packing: wholeFrom(data, "packing", 0) }),
  miseEnPlace: () => MISE,
  plates: (number) => ({ ...PLATES, stock: number("stock") }),
  fatigue: () => FATIGUE,
  pauses: () => PAUSES,
  errors: () => ERRORS,
  breakdowns: () => BREAKDOWNS,
  crossing: () => true,
  hygiene: (_number, data) => ({ ...HYGIENE, every: wholeFrom(data, "boardEvery", 0) }),
};

/** The kitchen the form describes, from `setup`: its text, its service, its robots' roles, its options. */
export function kitchenFrom(form, setup) {
  const data = new FormData(form);
  const number = (name) => wholeFrom(data, name, 1);
  const roles = String(data.get("roles")).split(/\s+/).filter(Boolean).map((role) => (ROLES.includes(role) ? role : null));
  const options = Object.fromEntries(Object.entries(OPTIONS).map(([name, read]) => [name, data.get(name) ? read(number, data) : null]));
  return { ...setup, label: "Cuisine modifiée", text: String(data.get("text")).trimEnd(), every: number("every"), patience: number("patience"), lastOrder: number("lastOrder"), service: number("service"), pace: number("pace"), roles, ...options };
}
