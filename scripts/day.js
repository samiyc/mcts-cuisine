import { dayMeasures } from "../src/day-measures.js";
import { runDay } from "../src/day.js";

/**
 * `npm run journee -- [days]`: the showcase's day on several seeds (docs/journee.md, Sami 1/11/2026), its measures on
 * average and how long a day takes to compute. A tenth of a second a day: no need of the queue.
 */
const days = Number(process.argv[2] ?? 20);
const SUMMED = ["guests", "tables", "plates", "tickets", "ticketMean", "ticketP90", "ticketMax", "peakTickets", "peakGuests", "tableMean", "waitedMean", "waitedMax", "refused", "cooledMax", "drinks"];

const seeds = Array.from({ length: days }, (_, i) => i + 1);
const t0 = performance.now();
const measures = seeds.map((seed) => dayMeasures(runDay({ seed })));
const ms = (performance.now() - t0) / days;
const average = (read) => measures.reduce((total, one) => total + read(one), 0) / days;

for (const name of SUMMED) console.log(`${name.padEnd(12)} ${average((one) => one[name]).toFixed(1)}`);
const latest = measures.reduce((last, one) => (one.closedSeconds > last.closedSeconds ? one : last));
console.log(`\nfermé à       ${latest.closedAt} au plus tard, ${ms.toFixed(0)} ms par journée`);
console.log("\nposte  cases  pris au plus  plein pendant le service");
measures[0].stations.forEach((station, i) => console.log(`${station.kind.padEnd(6)} ${String(station.count).padEnd(6)} ${average((one) => one.stations[i].highest).toFixed(1).padEnd(13)} ${average((one) => one.stations[i].fullShare).toFixed(1)} %`));
console.log("\nqui             mètres  heures");
measures[0].staff.forEach((person, i) => console.log(`${person.name.padEnd(17)} ${average((one) => one.staff[i].metres).toFixed(0).padEnd(7)} ${average((one) => one.staff[i].worked).toFixed(1)}`));
