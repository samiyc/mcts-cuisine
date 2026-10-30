import { HUMANS, HUMAN_LABELS, RULE_LABELS } from "../../src/rules.js";
import { bottleneckOf } from "../../src/service-measures.js";
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
const num = (text) => el("td", { class: "num" }, text);
const table = (head, rows) => el("div", { class: "scroll" }, el("table", {}, el("thead", {}, el("tr", {}, ...head.map((label, i) => el("th", { class: i > 0 ? "num" : null }, label)))), el("tbody", {}, ...rows)));

/** The dishes: served in time, late, not served, and the gain over the oldest order first. */
const dishesRow = (state, name, row) => el("tr", { class: name === state.rule ? "current" : null }, el("td", {}, RULE_LABELS[name]), num(fixed(row.orders)), num(fixed(row.onTime)), num(fixed(row.late)), num(fixed(row.missed)), num(gainOf(name, row)));

/** The indicators of step 0 (docs/recherche/indicateurs.md): the ticket times, the rush, the bottleneck. */
function indicatorsRow(state, name, row) {
  const neck = bottleneckOf(row);
  const used = neck ? `${neck.use.word} ${Math.round(100 * neck.use.share)} %` : "—";
  const waited = neck ? `${neck.wait.word} ${fixed(neck.wait.turns)}` : "—";
  const idle = neck ? `${neck.idle.word} ${fixed(neck.idle.turns)}` : "—";
  return el("tr", { class: name === state.rule ? "current" : null }, el("td", {}, RULE_LABELS[name]), num(fixed(row.meanServe)), num(fixed(row.p90Serve)), num(fixed(row.maxServe)), num(fixed(row.maxLate)), num(fixed(row.peakOpen)), num(used), num(waited), num(idle));
}

export function statsView({ state }) {
  if (state.busy) return [el("p", { class: "summary", role: "status" }, state.busy)];
  if (!state.compared) return [el("p", { class: "hint" }, "Lancez une comparaison dans le panneau.")];
  const { services, rows: compared } = state.compared;
  const entries = Object.entries(compared);
  return [
    // The chef at the keyboard plays no comparison: the robots are then alone (30/10/2026, the title said « c'est vous »).
    el("h2", {}, `Sur les mêmes ${services} services, ${HUMANS[state.human] ? "le cuisinier " + HUMAN_LABELS[state.human] : "sans cuisinier : les robots seuls"}`),
    table(["Les robots prennent", "commandes", "à temps", "en retard", "pas servies", "gain à temps (IC 95 %)"], entries.map(([name, row]) => dishesRow(state, name, row))),
    el("h3", {}, "Les indicateurs du métier (moyennes par service, en tours)"),
    el("p", { class: "hint" }, "Le bon : de la commande au passe. Le coup de feu : le plus de bons ouverts à la fois. Le poste le plus occupé : la part des tours où le plus chargé de sa sorte travaille ; l'attente : les tours passés à attendre qu'un poste de cette sorte se libère ; réservé sans travailler : les tours où un poste de cette sorte est retenu par un cuisinier encore en chemin (docs/recherche/indicateurs.md)."),
    table(["Les robots prennent", "bon moyen", "bon p90", "bon max", "retard max", "coup de feu", "poste le plus occupé", "le plus attendu", "réservé sans travailler"], entries.map(([name, row]) => indicatorsRow(state, name, row))),
    ...(entries[0][1].tables === undefined ? [] : tablesPart(state, entries)),
    ...(entries[0][1].refused === undefined ? [] : rupturePart(state, entries)),
  ];
}

/** The rupture (step 1): the orders refused once a crate is empty, beside those served. */
const rupturePart = (state, entries) => [
  el("h3", {}, "La rupture"),
  table(["Les robots prennent", "commandes", "refusées", "à temps", "pas servies"], entries.map(([name, row]) => el("tr", { class: name === state.rule ? "current" : null }, el("td", {}, RULE_LABELS[name]), num(fixed(row.orders)), num(fixed(row.refused)), num(fixed(row.onTime)), num(fixed(row.missed))))),
];

/** The tables (step 1 of the trades' roadmap): those sent in time, the dishes dead at the pass, the longest wait there. */
const tablesPart = (state, entries) => [
  el("h3", {}, "Les tables"),
  table(
    ["Les robots prennent", "tables", "parties à temps", "plats morts au passe", "attente max au passe"],
    entries.map(([name, row]) => el("tr", { class: name === state.rule ? "current" : null }, el("td", {}, RULE_LABELS[name]), num(fixed(row.tables)), num(fixed(row.tablesOnTime)), num(fixed(row.died)), num(fixed(row.maxPass)))),
  ),
];
