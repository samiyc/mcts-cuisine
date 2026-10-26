import { HUMAN_LABELS, RULE_LABELS } from "../../src/rules.js";
import { el, fixed } from "../dom.js";
import { sharedKnobs } from "./service.js";

/**
 * The tab « Stats » (Sami, 26/10/2026, lopin's layout): the robots' rules on the same services, and the search on
 * fewer (it thinks at each choice); the gain over the oldest order first, by pairs, with its interval. `ctx`: the
 * page's `state`, `COMPARED`, `COMPARED_WITH_SEARCH`.
 */
export const statsPanel = ({ state, COMPARED, COMPARED_WITH_SEARCH }) =>
  el(
    "section",
    { class: "panel" },
    el("h2", {}, "Comparer"),
    ...sharedKnobs(state),
    el("button", { type: "button", "data-action": "compare" }, `Les règles des robots sur ${COMPARED} services`),
    el("button", { type: "button", class: "quiet", "data-action": "compareSearch" }, `Avec la recherche sur ${COMPARED_WITH_SEARCH} services`),
    el("p", { class: "hint" }, "Les mêmes commandes pour chaque règle, à partir du service choisi ; le gain en plats servis à temps contre « la plus ancienne », par paires, avec son intervalle à 95 %."),
  );

const gainOf = (name, row) => (name === "oldest" ? "—" : `${fixed(row.gain.mean, 2)} (${fixed(row.gain.low, 2)} à ${fixed(row.gain.high, 2)})`);

export function statsView({ state }) {
  if (state.busy) return [el("p", { class: "summary", role: "status" }, state.busy)];
  if (!state.compared) return [el("p", { class: "hint" }, "Lancez une comparaison dans le panneau.")];
  const { services, rows: compared } = state.compared;
  const rows = Object.entries(compared).map(([name, row]) => el("tr", { class: name === state.rule ? "current" : null }, el("td", {}, RULE_LABELS[name]), el("td", { class: "num" }, fixed(row.orders)), el("td", { class: "num" }, fixed(row.onTime)), el("td", { class: "num" }, fixed(row.late)), el("td", { class: "num" }, fixed(row.missed)), el("td", { class: "num" }, gainOf(name, row))));
  const head = ["Les robots prennent", "commandes", "à temps", "en retard", "pas servies", "gain à temps (IC 95 %)"].map((label, i) => el("th", { class: i > 0 ? "num" : null }, label));
  return [el("h2", {}, `Sur les mêmes ${services} services, le cuisinier ${HUMAN_LABELS[state.human]}`), el("div", { class: "scroll" }, el("table", {}, el("thead", {}, el("tr", {}, ...head)), el("tbody", {}, ...rows)))];
}
