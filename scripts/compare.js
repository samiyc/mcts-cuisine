import { KITCHENS } from "../src/kitchens.js";
import { HUMAN_LABELS, HUMANS, RULE_LABELS, RULES, compareRules } from "../src/rules.js";
import { searchRule } from "../src/search.js";

/**
 * `npm run compare -- [--kitchen petite|couloir|brigade] [--services 100] [--search [budget]]`: the robots' rules
 * on the same drawn services, with each simulated human and with none; every kitchen when none is named.
 * `--search` adds the search (src/search.js, ~1 to 3 s a service).
 */
const args = process.argv.slice(2);
const services = args.includes("--services") ? Number(args[args.indexOf("--services") + 1]) : 100;
const named = args.includes("--kitchen") ? [args[args.indexOf("--kitchen") + 1]] : Object.keys(KITCHENS);
const searching = args.includes("--search");
const budget = searching && /^\d+$/.test(args[args.indexOf("--search") + 1] ?? "") ? Number(args[args.indexOf("--search") + 1]) : undefined;
const rules = searching ? { ...RULES, search: searchRule({ budget }) } : RULES;
const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
for (const id of named) {
  const setup = KITCHENS[id];
  if (!setup) throw new Error(`cuisine inconnue ; au choix : ${Object.keys(KITCHENS).join(", ")}`);
  console.log(`\n${setup.label} : ${services} services`);
  console.log("L'humain              | Règle des robots         | commandes | à temps | en retard | manquées | gain à temps (IC 95 %)");
  for (const humanName of [...Object.keys(HUMANS), "none"]) {
    const result = compareRules(setup, { services, humanName, rules });
    for (const [name, row] of Object.entries(result)) {
      const gain = name === "oldest" ? "—" : `${fixed(row.gain.mean, 2)} (${fixed(row.gain.low, 2)} à ${fixed(row.gain.high, 2)})`;
      console.log([HUMAN_LABELS[humanName].padEnd(21), RULE_LABELS[name].padEnd(24), fixed(row.orders).padStart(9), fixed(row.onTime).padStart(7), fixed(row.late).padStart(9), fixed(row.missed).padStart(8), gain.padStart(22)].join(" | "));
    }
  }
}
