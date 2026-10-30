import { progress } from "mcts-commun/trace.js";
import { readKitchen } from "../src/kitchen.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMAN_LABELS, RULE_LABELS, RULES, compareRules, humansOf } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { bottleneckOf } from "../src/service-measures.js";
import { BANQUET } from "../src/service-banquet.js";
import { DELIVERY } from "../src/service-delivery.js";
import { MISE } from "../src/service-mise.js";
import { HYGIENE } from "../src/service-hygiene.js";
import { ERRORS, FATIGUE, PAUSES } from "../src/service-human.js";
import { BREAKDOWNS } from "../src/service-breakdowns.js";
import { SUPPLY } from "../src/service-supply.js";
import { TABLES } from "../src/service-tables.js";
import { measureKey, openLines } from "./compare-lines.js";
import { searchLines } from "./compare-search.js";
import { searchTally } from "./search-tally.js";

/**
 * `npm run compare -- [--kitchen petite|couloir|brigade] [--services 100] [--de 1] [--lignes] [--search [budget]] [--arret-anticipe] [--contre key=value,…] [--tables] [--rupture [n]] [--banquet] [--livraison] [--serie [k]] [--couverts n] [--chaud m] [--mise-en-place] [--aboyeur] [--hygiene] [--fatigue] [--pauses] [--erreurs] [--pannes] [--croisement] [--sans-ensemble] [--humain urgent]`: the
 * robots' rules on the same drawn services, with each simulated human the service may have (src/rules.js, `humansOf`)
 * and with none, or only `--humain` (a name of HUMANS, or none); every kitchen when none is named.
 * `--search` adds the search (src/search.js, ~1 to 3 s a service). Since step 0 of the trades' roadmap (26/10), each
 * row also gives the ticket time at the 9th decile and at most, the rush (the most orders open at once) and the
 * bottleneck: the station kind most at work, and the one cooks waited for most (means over the services).
 */
const args = process.argv.slice(2);
const services = args.includes("--services") ? Number(args[args.indexOf("--services") + 1]) : 100;
const named = args.includes("--kitchen") ? [args[args.indexOf("--kitchen") + 1]] : Object.keys(KITCHENS);
const searching = args.includes("--search");
// `--de n`: the first service played (1 by default), so a measure is cut in slices; `--lignes`: each service written as it
// is played, and those already there for this code taken back (scripts/compare-lines.js).
const first = args.includes("--de") ? Number(args[args.indexOf("--de") + 1]) : 1;
const linesOn = args.includes("--lignes");
const onlyHuman = args.includes("--humain") ? args[args.indexOf("--humain") + 1] : null;
const budget = searching && /^\d+$/.test(args[args.indexOf("--search") + 1] ?? "") ? Number(args[args.indexOf("--search") + 1]) : undefined;
// `--arret-anticipe` (mcts-commun's earlyStop, 27/10/2026): the search without the early stop (`search`, as before the
// evening of 27/10) beside the search with it (`earlyStop`, the default since), on the same services. Each search
// counts its decisions, iterations, ms and `diagnose`'s codes (scripts/search-tally.js), written with its service.
const early = searching && args.includes("--arret-anticipe");
// `--contre key=value,…` (28/10/2026): the search with these settings (`variant`, e.g. `budget=128` or `grace=30`) beside the
// search as it is, on the same services, by pairs.
const against = searching && args.includes("--contre") ? args[args.indexOf("--contre") + 1] : null;
const settingsOf = (text) => Object.fromEntries(text.split(",").map((pair) => pair.split("=")).map(([key, value]) => [key, Number(value)]));
const tallies = searching ? { search: searchTally(), ...(early ? { earlyStop: searchTally() } : {}), ...(against ? { variant: searchTally() } : {}) } : {};
const searchOf = (name, extra) => searchRule({ ...(budget ? { budget } : {}), ...extra, onResult: tallies[name].onResult });
const rules = searching ? { ...RULES, search: searchOf("search", early ? { earlyStop: false } : {}), ...(early ? { earlyStop: searchOf("earlyStop", { earlyStop: true }) } : {}), ...(against ? { variant: searchOf("variant", settingsOf(against)) } : {}) } : RULES;
const LABELS = { ...RULE_LABELS, earlyStop: "recherche, arrêt anticipé", variant: `recherche, ${against}` };
// `--rupture [n]`: every crate holds n ingredients (6 by default, service-supply.js), the orders refused once it is empty.
function ruptureOf() {
  if (!args.includes("--rupture")) return 0;
  const next = args[args.indexOf("--rupture") + 1] ?? "";
  return /^\d+$/.test(next) ? Number(next) : SUPPLY.o;
}
const rupture = ruptureOf();
// `--tables`: every kitchen with tables of two or three dishes, a dish dying after 10 turns at the pass (service-tables.js).
const tables = args.includes("--tables");
// `--banquet`: every kitchen serves a banquet instead of its orders (service-banquet.js).
const banquet = args.includes("--banquet");
// `--livraison`: every order is delivered by a courier (service-delivery.js).
const delivery = args.includes("--livraison");
// `--mise-en-place`: free robots prepare soups ahead (service-mise.js); `--aboyeur`: the last robot is the aboyeur (service-aboyeur.js).
const mise = args.includes("--mise-en-place");
// `--serie [k]`: at a banquet, dishes of a course made k at a time (service-batch.js; the whole course by default).
function serieOf() {
  if (!args.includes("--serie")) return 0;
  const next = args[args.indexOf("--serie") + 1] ?? "";
  return /^\d+$/.test(next) ? Number(next) : 99;
}
const serie = serieOf();
// `--couverts n`, `--chaud m`: the banquet's guests and turns warm (service-banquet.js: 6 and 60).
const numberAfter = (flag) => (args.includes(flag) ? Number(args[args.indexOf(flag) + 1]) : null);
const banquetOf = () => ({ ...BANQUET, ...(serie ? { batch: serie } : {}), ...(numberAfter("--couverts") ? { covers: numberAfter("--couverts") } : {}), ...(numberAfter("--chaud") ? { pass: numberAfter("--chaud") } : {}) });
const aboyeur = args.includes("--aboyeur");
// `--croisement`: the cooks cross in the aisles, the stations' cells kept one cook's (service-crossing.js).
const crossing = args.includes("--croisement");
// `--sans-ensemble` (with `--tables`): the robots start any dish, as before 30/10/2026 (service-firing.js `together`, on by default since).
const apart = args.includes("--sans-ensemble");
// `--hygiene`: guests allergic to onions, boards cleaned before their salads (service-hygiene.js).
const hygiene = args.includes("--hygiene");
// `--fatigue`, `--pauses`, `--erreurs`: the human's limits (service-human.js); `--pannes`: the robots' breakdowns (service-breakdowns.js).
const LIMITS = { "--fatigue": { fatigue: FATIGUE }, "--pauses": { pauses: PAUSES }, "--erreurs": { errors: ERRORS }, "--pannes": { breakdowns: BREAKDOWNS } };
const limits = Object.assign({}, ...Object.entries(LIMITS).filter(([flag]) => args.includes(flag)).map(([, value]) => value));
function withAboyeur(setup) {
  const robots = readKitchen(setup.text).robots.length;
  return { ...setup, roles: Array.from({ length: robots }, (_, i) => (i === robots - 1 ? "aboyeur" : (setup.roles?.[i] ?? null))) };
}
const fixed = (value, digits = 1) => value.toFixed(digits).replace(".", ",");
const gainOf = (name, row) => (name === "oldest" ? "—" : `${fixed(row.gain.mean, 2)} (${fixed(row.gain.low, 2)} à ${fixed(row.gain.high, 2)})`);
/** The bottleneck in words: the kind most at work (its busiest station's share of the turns), the one waited for most. */
function bottleneckText(row) {
  const neck = bottleneckOf(row);
  return `${neck.use.word} ${Math.round(100 * neck.use.share)} % ; attente : ${neck.wait.word} ${fixed(neck.wait.turns)}`;
}
const HEAD = "L'humain              | Règle des robots         | commandes | à temps | en retard | manquées | gain à temps (IC 95 %) | bon p90 | bon max | pic | goulot";
/** The setup of kitchen `id` with the options asked. */
function setupOf(id) {
  if (!KITCHENS[id]) throw new Error(`cuisine inconnue ; au choix : ${Object.keys(KITCHENS).join(", ")}`);
  /** @type {[unknown, () => object][]} */
  const options = [[tables, () => ({ tables: apart ? { ...TABLES, together: false } : TABLES })], [rupture, () => ({ supply: { o: rupture, t: rupture } })], [banquet, () => ({ banquet: banquetOf() })], [delivery, () => ({ delivery: { ...DELIVERY, ...KITCHENS[id].delivery } })], [mise, () => ({ miseEnPlace: MISE })], [hygiene, () => ({ hygiene: HYGIENE })], [crossing, () => ({ crossing: true })]];
  const setup = Object.assign({ ...KITCHENS[id] }, ...options.filter(([on]) => on).map(([, part]) => part()), limits);
  return aboyeur ? withAboyeur(setup) : setup;
}
/** A summary's row, in words. */
function rowText(humanName, name, row) {
  const first = [HUMAN_LABELS[humanName].padEnd(21), LABELS[name].padEnd(24), fixed(row.orders).padStart(9), fixed(row.onTime).padStart(7), fixed(row.late).padStart(9), fixed(row.missed).padStart(8), gainOf(name, row).padStart(22)];
  const tableText = [...(tables ? [`tables à temps ${fixed(row.tablesOnTime)} / ${fixed(row.tables)}, morts au passe ${fixed(row.died)}`] : []), ...(rupture ? [`refusées ${fixed(row.refused)}`] : []), ...(banquet ? [`envois à l'heure ${fixed(row.tablesOnTime)} / 2, retard max d'envoi ${fixed(row.maxSendLate)}, perdus à l'étuve ${fixed(row.died)}`] : []), ...(delivery ? [`partis sans plat ${fixed(row.gone)}, attente des coursiers ${fixed(row.meanCourierWait)} (max ${fixed(row.maxCourierWait)}), froids ${fixed(row.died)}`] : [])];
  return [...first, fixed(row.p90Serve).padStart(7), fixed(row.maxServe).padStart(7), fixed(row.peakOpen).padStart(3), bottleneckText(row), ...tableText].join(" | ");
}

const setups = named.map((id) => [id, setupOf(id)]);
const humansFor = (setup) => (onlyHuman ? [onlyHuman] : [...humansOf(setup), "none"]);
// How far the run is (mcts-commun's progress, for the queue's views), a short line on stderr for whoever reads the output.
const total = services * setups.reduce((sum, [, setup]) => sum + humansFor(setup).length, 0);
let done = 0;
let reused = 0;
function tick(setup, humanName, seed, found) {
  done += 1;
  if (found) reused += 1;
  progress("compare", done, total, { unit: "service", kitchen: setup.label, human: humanName });
  if (!found) console.error(`service ${done}/${total} (${setup.label}, ${HUMAN_LABELS[humanName]}, n° ${seed})`);
}
for (const [id, setup] of setups) {
  const lines = linesOn ? openLines(measureKey({ setup, rules: Object.keys(rules), budget: budget ?? null, ...(against ? { against } : {}) }), `${id}-${onlyHuman ?? "tous"}-${first}`) : null;
  const from = first > 1 ? `, à partir du n° ${first}` : "";
  console.log(`
${setup.label} : ${services} services${from}`);
  console.log(HEAD);
  for (const humanName of humansFor(setup)) {
    const known = (seed) => lines?.known(humanName, seed);
    const seen = [];
    const onService = (seed, measures, found) => {
      if (!found) for (const [name, tally] of Object.entries(tallies)) measures[name] = { ...measures[name], search: tally.take() };
      if (!found) lines?.write(humanName, seed, measures);
      seen.push(measures);
      tick(setup, humanName, seed, found);
    };
    const result = compareRules(setup, { services, seed: first, humanName, rules, known, onService });
    for (const [name, row] of Object.entries(result)) console.log(rowText(humanName, name, row));
    for (const text of searchLines(seen, LABELS)) console.log(`${HUMAN_LABELS[humanName].padEnd(21)} | ${text}`);
  }
  if (lines) console.error(`lignes : ${lines.written} écrites dans ${lines.file}, ${reused} services repris`);
}
