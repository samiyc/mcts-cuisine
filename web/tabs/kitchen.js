import { KITCHENS } from "../../src/kitchens.js";
import { BANQUET } from "../../src/service-banquet.js";
import { DELIVERY } from "../../src/service-delivery.js";
import { MISE } from "../../src/service-mise.js";
import { PLATES } from "../../src/service-plates.js";
import { SUPPLY } from "../../src/service-supply.js";
import { TABLES } from "../../src/service-tables.js";
import { board } from "../board.js";
import { el, select } from "../dom.js";

/**
 * The tab « Cuisine » (Sami, 22/10/2026: change the kitchen to test other configurations; a tab of its own on
 * 26/10): a kitchen to start from in the panel, with the legend of the plan; its text and its service in the view,
 * and the plan as it stands. `ctx`: the page's `state`.
 */
/** Unattended cooking's defaults in the editor (Sami, 23/10): a ready soup burns after 6 turns, a burnt stove takes 5 to clean. */
const UNATTENDED = Object.freeze({ burn: 6, clean: 5 });
const ROLES = ["coupe", "cuisson", "salade", "passe", "aboyeur", "plonge"];

export const kitchenPanel = ({ state }) =>
  el(
    "section",
    { class: "panel" },
    el("h2", {}, "La cuisine"),
    el("label", {}, "Partir de", select("kitchen", Object.entries(KITCHENS).map(([id, kitchen]) => [id, kitchen.label]), state.kitchenId)),
    el("p", { class: "hint" }, "Le plan en texte : « . » le sol, « R » un robot, « H » le cuisinier, « # » un mur, « _ » un comptoir (un plat y attend qu'un autre le reprenne), « o » et « t » les caisses d'oignons et de tomates, « C » une planche, « P » un fourneau, « S » le passe, « E » un poste d'emballage (la livraison), « L » un évier (la plonge)."),
    el("p", { class: "hint" }, "La soupe peut cuire seule : on pose la marmite 🥘 et on repart ; prête 🍲, elle attend qu'on vienne la retirer, le chiffre dit dans combien de tours elle brûle. Brûlée, le plat est perdu, la commande est à refaire, et le fourneau doit être nettoyé 🧽 avant de resservir."),
  );

const field = (label, name, value) => el("label", {}, label, el("input", { name, type: "number", min: "1", value: String(value) }));

/** The service's own settings: its pace of orders, the guests' patience, its length, the cooks' pace and the robots' roles. */
function serviceFields(setup) {
  const roles = el("input", { name: "roles", value: (setup.roles ?? []).map((role) => role || "-").join(" "), placeholder: "coupe cuisson", title: "Un mot par robot, dans l'ordre du plan : coupe, cuisson, salade, passe (sert ce qui est prêt), aboyeur (au passe, il annonce les plats des tables et réclame celui qui manque ; les autres robots font ce qu'il annonce), plonge (lave les assiettes, il faut un évier « L »), ou - pour un robot qui fait tout" });
  return [
    field("Une commande tous les (tours)", "every", setup.every),
    field("Patience d'un client (tours)", "patience", setup.patience),
    field("Dernière commande (tour)", "lastOrder", setup.lastOrder),
    field("Fin du service (tour)", "service", setup.service),
    field("Cases parcourues par tour", "pace", setup.pace ?? 1),
    el("label", {}, "Rôles des robots", roles),
  ];
}

const check = (name, on, label) => el("label", { class: "check" }, el("input", { name, type: "checkbox", checked: Boolean(on) }), label);

/** The options, each a box to tick and its figures: what they would be if ticked, the kitchen's own or the defaults. */
function optionFields(setup) {
  const [cooking, tables, supply] = [{ ...UNATTENDED, ...setup.unattended }, { ...TABLES, ...setup.tables }, { ...SUPPLY, ...setup.supply }];
  return [
    check("unattended", setup.unattended, "La soupe cuit seule"),
    field("Elle brûle, prête, après (tours)", "burn", cooking.burn),
    field("Nettoyer un fourneau brûlé (tours)", "clean", cooking.clean),
    check("tables", setup.tables, `Des tables (${TABLES.min} à ${TABLES.max} plats, servis ensemble)`),
    field("Un plat attend sa table au passe (tours)", "pass", tables.pass),
    check("supply", setup.supply, "Un stock par caisse (rupture : les commandes sont refusées)"),
    field("Oignons pour le service", "onions", supply.o),
    field("Tomates pour le service", "tomatoes", supply.t),
    ...laterFields(setup),
  ];
}

/** The options of 26/10: delivery and packing, the dish room, the mise en place, the banquet and its batches. */
function laterFields(setup) {
  return [
    check("delivery", setup.delivery, `La livraison : un coursier par commande, annoncé ${DELIVERY.prep} tours après elle, à ${DELIVERY.spread} tours près ; il attend ${DELIVERY.wait} tours`),
    el("label", {}, "Emballer un plat (tours ; 0 : sans emballage ; il faut un poste « E » dans le plan)", el("input", { name: "packing", type: "number", min: "0", value: String(setup.delivery?.packing ?? 0) })),
    check("plates", setup.plates, `La plonge : des assiettes comptées, rendues sales ${PLATES.back} tours après le plat, lavées par ${PLATES.rack} à l'évier « L »`),
    field("Assiettes pour le service", "stock", setup.plates?.stock ?? PLATES.stock),
    check("miseEnPlace", setup.miseEnPlace, `La mise en place : un robot sans commande coupe d'avance les oignons d'une soupe et les pose sur un comptoir (${MISE.ahead} au plus)`),
    check("banquet", setup.banquet, `Un banquet : ${BANQUET.covers} couverts environ, l'entrée vers le tour ${BANQUET.courses[0].at}, le plat vers le tour ${BANQUET.courses[1].at}, ${BANQUET.pass} tours au chaud au plus`),
    field("Plats d'un envoi faits ensemble (coupe en série ; 1 : un par un)", "batch", setup.banquet?.batch ?? BANQUET.batch),
  ];
}

const fieldsOf = (setup) => el("div", { class: "fields" }, ...serviceFields(setup), ...optionFields(setup));

export function kitchenView({ state }) {
  const { setup } = state;
  const form = el("form", { "data-form": "kitchen", class: "editor" }, el("textarea", { name: "text", rows: String(setup.text.split("\n").length + 1), spellcheck: "false" }, setup.text), fieldsOf(setup), el("button", { type: "submit" }, "Appliquer"));
  return [el("h2", {}, setup.label ?? "Cuisine modifiée"), form, state.error ? el("p", { class: "error", role: "alert" }, state.error) : null, board(state.service)].filter(Boolean);
}

/** Each option ticked, read from the form (`number` a field's figure, at least 1); null when not ticked. */
const OPTIONS = {
  unattended: (number) => ({ burn: number("burn"), clean: number("clean") }),
  tables: (number) => ({ ...TABLES, pass: number("pass") }),
  supply: (number) => ({ o: number("onions"), t: number("tomatoes") }),
  banquet: (number) => ({ ...BANQUET, batch: number("batch") }),
  delivery: (_number, data) => ({ ...DELIVERY, packing: Math.max(0, Number(data.get("packing")) || 0) }),
  miseEnPlace: () => MISE,
  plates: (number) => ({ ...PLATES, stock: number("stock") }),
};

/** The kitchen the form describes, from `setup`: its text, its service, its robots' roles, its options. */
export function kitchenFrom(form, setup) {
  const data = new FormData(form);
  const number = (name) => Math.max(1, Number(data.get(name)) || 1);
  const roles = String(data.get("roles")).split(/\s+/).filter(Boolean).map((role) => (ROLES.includes(role) ? role : null));
  const options = Object.fromEntries(Object.entries(OPTIONS).map(([name, read]) => [name, data.get(name) ? read(number, data) : null]));
  return { ...setup, label: "Cuisine modifiée", text: String(data.get("text")).trimEnd(), every: number("every"), patience: number("patience"), lastOrder: number("lastOrder"), service: number("service"), pace: number("pace"), roles, ...options };
}
