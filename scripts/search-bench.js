import { paired } from "mcts-commun/measure.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { runService } from "../src/simulate.js";
import { searchTally, tallyText } from "./search-tally.js";

/**
 * `node scripts/search-bench.js [services] [kitchen|toutes] [human] [variant…] [--diagnose]`: the search against the
 * oldest and the quickest-dish rules on the same drawn services, by pairs (dishes served in time over the quickest
 * rule's). A variant is `key=value,key=value` over SEARCH_SETTINGS, e.g. `budget=128,horizon=80`; `human=urgent`
 * gives the search the human's true model (a measure, see src/search.js). `--diagnose` (mcts-commun, 27/10/2026)
 * counts, for each variant, the codes `diagnose` gives its decisions (scripts/search-tally.js); the same results.
 */
const diagnosing = process.argv.includes("--diagnose");
const [servicesArg = "20", kitchenArg = "petite", humanName = "urgent", ...variants] = process.argv.slice(2).filter((arg) => arg !== "--diagnose");
const services = Number(servicesArg);
const kitchens = kitchenArg === "toutes" ? Object.keys(KITCHENS) : [kitchenArg];
const human = HUMANS[humanName] ?? null;
const optionsOf = (text) => Object.fromEntries(text.split(",").filter(Boolean).map((pair) => pair.split("=")).map(([key, value]) => [key, key === "human" ? HUMANS[value] : Number(value)]));
const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
const names = variants.length ? variants : [""];
for (const id of kitchens) {
  const setup = KITCHENS[id];
  const quickest = [];
  const rows = { oldest: [], ...Object.fromEntries(names.map((text) => [`search ${text}`, []])) };
  const tallies = Object.fromEntries(names.map((text) => [text, searchTally()]));
  const rulesOf = Object.fromEntries(names.map((text) => [text, searchRule({ ...optionsOf(text), ...(diagnosing ? { onResult: tallies[text].onResult } : {}) })]));
  const started = Date.now();
  for (let i = 0; i < services; i += 1) {
    quickest.push(runService(setup, 1 + i, RULES.quickest, human).measures);
    rows.oldest.push(runService(setup, 1 + i, RULES.oldest, human).measures);
    for (const text of names) rows[`search ${text}`].push(runService(setup, 1 + i, rulesOf[text], human).measures);
  }
  const mean = (measures, key) => measures.reduce((sum, one) => sum + one[key], 0) / measures.length;
  console.log(`\n${setup.label}, humain ${humanName} : ${services} services, ${((Date.now() - started) / 1000).toFixed(0)} s ; plat le plus rapide : ${fixed(mean(quickest, "onTime"))} à temps sur ${fixed(mean(quickest, "orders"))}`);
  for (const [name, measures] of Object.entries(rows)) {
    const gain = paired(measures.map((one) => one.onTime), quickest.map((one) => one.onTime));
    const wins = measures.filter((one, i) => one.onTime > quickest[i].onTime).length;
    const losses = measures.filter((one, i) => one.onTime < quickest[i].onTime).length;
    console.log(`${name.padEnd(30)} à temps ${fixed(mean(measures, "onTime")).padStart(5)}  en retard ${fixed(mean(measures, "late")).padStart(4)}  gain ${fixed(gain.mean, 2)} (${fixed(gain.low, 2)} à ${fixed(gain.high, 2)})  ${wins}/${services - wins - losses}/${losses}`);
  }
  if (diagnosing) for (const text of names) console.log(`diagnose ${("search " + text).padEnd(21)} ${tallyText(tallies[text].take())}`);
}
