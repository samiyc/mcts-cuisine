import { paired } from "mcts-commun/measure.js";
import { sumOf, tallyText } from "./search-tally.js";

/**
 * What `npm run compare -- --search` adds under a human's rows (27/10/2026): each search's counts over the services
 * (`diagnose`'s codes, scripts/search-tally.js), and with `--arret-anticipe` the early stop against the search as it
 * is, by pairs over the same services: dishes in time and late, with their intervals, and what it spared.
 */
const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
const pairText = ({ mean, low, high }) => `${mean >= 0 ? "+" : ""}${fixed(mean, 2)} (${fixed(low, 2)} à ${fixed(high, 2)})`;

/** The early stop against the search, by pairs over `seen` (each service's measures by rule). */
function earlyText(seen) {
  const of = (name, key) => seen.map((one) => one[name][key]);
  const [search, early] = ["search", "earlyStop"].map((name) => sumOf(seen.map((one) => one[name].search)));
  const spared = (key) => `${Math.round(100 * (1 - early[key] / Math.max(search[key], 1)))} %`;
  const counted = early.decisions ? `, itérations −${spared("iterations")}, durée de la recherche −${spared("ms")}` : "";
  return `arrêt anticipé contre la recherche, par paires : à temps ${pairText(paired(of("earlyStop", "onTime"), of("search", "onTime")))}, en retard ${pairText(paired(of("earlyStop", "late"), of("search", "late")))}${counted}`;
}

/** The lines to print for the services `seen`, `labels` naming the rules. */
export function searchLines(seen, labels) {
  if (!seen.length || !seen[0].search) return [];
  const names = ["search", ...(seen[0].earlyStop ? ["earlyStop"] : [])];
  const counts = names.map((name) => `diagnose, ${labels[name]} : ${tallyText(sumOf(seen.map((one) => one[name].search)))}`);
  return seen[0].earlyStop ? [...counts, earlyText(seen)] : counts;
}
