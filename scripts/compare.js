import { KITCHENS } from "../src/kitchens.js";
import { HUMAN_LABELS, HUMANS, RULE_LABELS, RULES, compareRules } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { bottleneckOf } from "../src/service-measures.js";
import { SUPPLY } from "../src/service-supply.js";
import { TABLES } from "../src/service-tables.js";

/**
 * `npm run compare -- [--kitchen petite|couloir|brigade] [--services 100] [--search [budget]] [--tables] [--rupture [n]]`: the robots' rules
 * on the same drawn services, with each simulated human and with none; every kitchen when none is named.
 * `--search` adds the search (src/search.js, ~1 to 3 s a service). Since step 0 of the trades' roadmap (26/10), each
 * row also gives the ticket time at the 9th decile and at most, the rush (the most orders open at once) and the
 * bottleneck: the station kind most at work, and the one cooks waited for most (means over the services).
 */
const args = process.argv.slice(2);
const services = args.includes("--services") ? Number(args[args.indexOf("--services") + 1]) : 100;
const named = args.includes("--kitchen") ? [args[args.indexOf("--kitchen") + 1]] : Object.keys(KITCHENS);
const searching = args.includes("--search");
const budget = searching && /^\d+$/.test(args[args.indexOf("--search") + 1] ?? "") ? Number(args[args.indexOf("--search") + 1]) : undefined;
const rules = searching ? { ...RULES, search: searchRule(budget ? { budget } : {}) } : RULES;
// `--rupture [n]`: every crate holds n ingredients (6 by default, service-supply.js), the orders refused once it is empty.
function ruptureOf() {
  if (!args.includes("--rupture")) return 0;
  const next = args[args.indexOf("--rupture") + 1] ?? "";
  return /^\d+$/.test(next) ? Number(next) : SUPPLY.o;
}
const rupture = ruptureOf();
// `--tables`: every kitchen with tables of two or three dishes, a dish dying after 10 turns at the pass (service-tables.js).
const tables = args.includes("--tables");
const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
const gainOf = (name, row) => (name === "oldest" ? "—" : `${fixed(row.gain.mean, 2)} (${fixed(row.gain.low, 2)} à ${fixed(row.gain.high, 2)})`);
/** The bottleneck in words: the kind most at work (its busiest station's share of the turns), the one waited for most. */
function bottleneckText(row) {
  const neck = bottleneckOf(row);
  return `${neck.use.word} ${Math.round(100 * neck.use.share)} % ; attente : ${neck.wait.word} ${fixed(neck.wait.turns)}`;
}
const HEAD = "L'humain              | Règle des robots         | commandes | à temps | en retard | manquées | gain à temps (IC 95 %) | bon p90 | bon max | pic | goulot";
for (const id of named) {
  const setup = { ...KITCHENS[id], ...(tables ? { tables: TABLES } : {}), ...(rupture ? { supply: { o: rupture, t: rupture } } : {}) };
  if (!KITCHENS[id]) throw new Error(`cuisine inconnue ; au choix : ${Object.keys(KITCHENS).join(", ")}`);
  console.log(`\n${setup.label} : ${services} services`);
  console.log(HEAD);
  for (const humanName of [...Object.keys(HUMANS), "none"]) {
    const result = compareRules(setup, { services, humanName, rules });
    for (const [name, row] of Object.entries(result)) {
      const first = [HUMAN_LABELS[humanName].padEnd(21), RULE_LABELS[name].padEnd(24), fixed(row.orders).padStart(9), fixed(row.onTime).padStart(7), fixed(row.late).padStart(9), fixed(row.missed).padStart(8), gainOf(name, row).padStart(22)];
      const tableText = [...(tables ? [`tables à temps ${fixed(row.tablesOnTime)} / ${fixed(row.tables)}, morts au passe ${fixed(row.died)}`] : []), ...(rupture ? [`refusées ${fixed(row.refused)}`] : [])];
      console.log([...first, fixed(row.p90Serve).padStart(7), fixed(row.maxServe).padStart(7), fixed(row.peakOpen).padStart(3), bottleneckText(row), ...tableText].join(" | "));
    }
  }
}
