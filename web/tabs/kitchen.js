import { KITCHENS } from "../../src/kitchens.js";
import { board } from "../board.js";
import { el, select } from "../dom.js";

/**
 * The tab « Cuisine » (Sami, 22/10/2026: change the kitchen to test other configurations; a tab of its own on
 * 26/10): a kitchen to start from in the panel, with the legend of the plan; its text and its service in the view,
 * and the plan as it stands. `ctx`: the page's `state`.
 */
/** Unattended cooking's defaults in the editor (Sami, 23/10): a ready soup burns after 6 turns, a burnt stove takes 5 to clean. */
const UNATTENDED = Object.freeze({ burn: 6, clean: 5 });
const ROLES = ["coupe", "cuisson", "salade", "passe"];

export const kitchenPanel = ({ state }) =>
  el(
    "section",
    { class: "panel" },
    el("h2", {}, "La cuisine"),
    el("label", {}, "Partir de", select("kitchen", Object.entries(KITCHENS).map(([id, kitchen]) => [id, kitchen.label]), state.kitchenId)),
    el("p", { class: "hint" }, "Le plan en texte : « . » le sol, « R » un robot, « H » le cuisinier, « # » un mur, « _ » un comptoir (un plat y attend qu'un autre le reprenne), « o » et « t » les caisses d'oignons et de tomates, « C » une planche, « P » un fourneau, « S » le passe."),
    el("p", { class: "hint" }, "La soupe peut cuire seule : on pose la marmite 🥘 et on repart ; prête 🍲, elle attend qu'on vienne la retirer, le chiffre dit dans combien de tours elle brûle. Brûlée, le plat est perdu, la commande est à refaire, et le fourneau doit être nettoyé 🧽 avant de resservir."),
  );

const field = (label, name, value) => el("label", {}, label, el("input", { name, type: "number", min: "1", value: String(value) }));

function fieldsOf(setup) {
  const roles = el("input", { name: "roles", value: (setup.roles ?? []).map((role) => role || "-").join(" "), placeholder: "coupe cuisson", title: "Un mot par robot, dans l'ordre du plan : coupe, cuisson, salade, passe (sert ce qui est prêt), ou - pour un robot qui fait tout" });
  return el(
    "div",
    { class: "fields" },
    field("Une commande tous les (tours)", "every", setup.every),
    field("Patience d'un client (tours)", "patience", setup.patience),
    field("Dernière commande (tour)", "lastOrder", setup.lastOrder),
    field("Fin du service (tour)", "service", setup.service),
    el("label", {}, "Rôles des robots", roles),
    el("label", { class: "check" }, el("input", { name: "unattended", type: "checkbox", checked: Boolean(setup.unattended) }), "La soupe cuit seule"),
    field("Elle brûle, prête, après (tours)", "burn", setup.unattended?.burn ?? UNATTENDED.burn),
    field("Nettoyer un fourneau brûlé (tours)", "clean", setup.unattended?.clean ?? UNATTENDED.clean),
  );
}

export function kitchenView({ state }) {
  const { setup } = state;
  const form = el("form", { "data-form": "kitchen", class: "editor" }, el("textarea", { name: "text", rows: String(setup.text.split("\n").length + 1), spellcheck: "false" }, setup.text), fieldsOf(setup), el("button", { type: "submit" }, "Appliquer"));
  return [el("h2", {}, setup.label ?? "Cuisine modifiée"), form, state.error ? el("p", { class: "error", role: "alert" }, state.error) : null, board(state.service)].filter(Boolean);
}

/** The kitchen the form describes, from `setup`: its text, its service, its robots' roles, its cooking. */
export function kitchenFrom(form, setup) {
  const data = new FormData(form);
  const number = (name) => Math.max(1, Number(data.get(name)) || 1);
  const roles = String(data.get("roles")).split(/\s+/).filter(Boolean).map((role) => (ROLES.includes(role) ? role : null));
  const unattended = data.get("unattended") ? { burn: number("burn"), clean: number("clean") } : null;
  return { ...setup, label: "Cuisine modifiée", text: String(data.get("text")).trimEnd(), every: number("every"), patience: number("patience"), lastOrder: number("lastOrder"), service: number("service"), roles, unattended };
}
