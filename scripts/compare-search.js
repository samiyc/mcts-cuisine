import { paired } from "mcts-commun/measure.js";
import { sumOf, tallyText } from "./search-tally.js";

/**
 * What `npm run compare -- --search` adds under a human's rows (27/10/2026): each search's counts over the services
 * (`diagnose`'s codes, scripts/search-tally.js), with `--arret-anticipe` the early stop and with `--contre` a variant (28/10/2026)
 * against the search as it is, by pairs over the same services: dishes in time and late, with their intervals, and what it spared.
 */
const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
const pairText = ({ mean, low, high }) => `${mean >= 0 ? "+" : ""}${fixed(mean, 2)} (${fixed(low, 2)} à ${fixed(high, 2)})`;

/** Search `name` (`words`, what it is) against the search as it is, by pairs over `seen` (each service's measures by rule). */
function pairLine(seen, name, words) {
  const of = (rule, key) => seen.map((one) => one[rule][key]);
  const [search, other] = ["search", name].map((rule) => sumOf(seen.map((one) => one[rule].search)));
  // The change against the search as it is, signed (28/10/2026: budget=128 printed « −-93 % » for 93 % more).
  const change = (key) => {
    const percent = Math.round(100 * (other[key] / Math.max(search[key], 1) - 1));
    const sign = Math.sign(percent);
    return `${["−", "", "+"][sign + 1]}${Math.abs(percent)} %`;
  };
  const counted = other.decisions ? `, itérations ${change("iterations")}, durée de la recherche ${change("ms")}` : "";
  return `${words} contre la recherche, par paires : à temps ${pairText(paired(of(name, "onTime"), of("search", "onTime")))}, en retard ${pairText(paired(of(name, "late"), of("search", "late")))}${counted}`;
}

/** The lines to print for the services `seen`, `labels` naming the rules. */
export function searchLines(seen, labels) {
  if (!seen.length || !seen[0].search) return [];
  const names = ["search", ...["earlyStop", "variant"].filter((name) => seen[0][name])];
  const counts = names.map((name) => `diagnose, ${labels[name]} : ${tallyText(sumOf(seen.map((one) => one[name].search)))}`);
  const pairs = [...(seen[0].earlyStop ? [pairLine(seen, "earlyStop", "arrêt anticipé")] : []), ...(seen[0].variant ? [pairLine(seen, "variant", labels.variant)] : [])];
  return [...counts, ...pairs];
}
