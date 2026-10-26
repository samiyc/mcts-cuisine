import { KITCHENS } from "../../src/kitchens.js";
import { HUMAN_LABELS, RULE_LABELS } from "../../src/rules.js";
import { isOver, measuresOf } from "../../src/simulate.js";
import { kitchenView } from "../board.js";
import { el, select } from "../dom.js";
import { statusLine } from "../view.js";

/**
 * The tab « Service » (Sami, 26/10/2026, lopin's layout): its settings in the panel on the left (the kitchen, the
 * robots' rule, the cook, the service's number, the speed, and the buttons that play it), the service on its plan in
 * the view. `ctx`: the page's `state`, `keyboard`, `manual`, `replays`.
 */
const SPEEDS = [
  ["0.5", "très lente (2 s par tour)"],
  ["1", "lente (1 s par tour)"],
  ["2", "2 tours par seconde"],
  ["4", "normale (4 tours par s)"],
  ["10", "rapide (10 tours par s)"],
];

/** The kitchen, the robots' rule and the cook: the settings the tabs share. */
export const sharedKnobs = (state) => [
  el("label", {}, "Cuisine", select("kitchen", Object.entries(KITCHENS).map(([id, kitchen]) => [id, kitchen.label]), state.kitchenId)),
  el("label", {}, "Les robots prennent", select("rule", Object.entries(RULE_LABELS), state.rule)),
  el("label", {}, "Le cuisinier", select("human", Object.entries(HUMAN_LABELS), state.human)),
  el("label", {}, "Service n°", el("input", { type: "number", min: "1", value: String(state.seed), "data-knob": "seed", inputmode: "numeric" })),
];

const button = (action, label, quiet = true) => el("button", { type: "button", class: quiet ? "quiet" : null, "data-action": action }, label);

export function servicePanel({ state, manual, replays }) {
  const playing = state.timer !== null;
  const hint = manual() ? "Z Q S D pour bouger le chef, E pour prendre, travailler, poser, servir. En pause, une touche joue son tour." : "Choisissez « c'est vous, au clavier » pour jouer le cuisinier.";
  return el(
    "section",
    { class: "panel" },
    el("h2", {}, "Le service"),
    ...sharedKnobs(state),
    el("label", {}, "Vitesse", select("speed", SPEEDS, String(state.speed))),
    el("div", { class: "row-buttons" }, button(playing ? "pause" : "play", playing ? "Pause" : "Jouer", false), button("step", "Un tour"), button("finish", "Jusqu'au bout")),
    el("div", { class: "row-buttons" }, button("restart", "Recommencer"), button("next", "Service suivant")),
    replays.playing ? el("p", { class: "hint" }, "Un replay se joue : les touches viennent de lui.") : null,
    el("p", { class: "hint" }, hint),
  );
}

export function serviceView({ state, keyboard, manual }) {
  const over = isOver(state.service);
  const summary = el("p", { class: "summary", "aria-live": "polite" }, state.busy || statusLine(state.service, over ? measuresOf(state.service) : null));
  const chef = manual() ? el("p", { class: "summary chef", "aria-live": "polite" }, `Le chef (H) : ${keyboard.message || "à vous"}`) : null;
  return [summary, chef, kitchenView(state.service)].filter(Boolean);
}
