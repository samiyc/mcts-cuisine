import { dayMeasures } from "../src/day-measures.js";
import { runDay } from "../src/day.js";

/**
 * `npm run journee -- [days] [margin]`: the showcase's day on several seeds (docs/journee.md, Sami 1/11/2026), its measures on
 * average and how long a day takes to compute; `margin`, what the kitchen makes beyond its forecast (0.25: its default). A
 * tenth of a second a day: no need of the queue.
 */
const days = Number(process.argv[2] ?? 20);
const margin = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
const SUMMED = ["guests", "tables", "plates", "tickets", "ticketMean", "ticketP90", "ticketMax", "peakTickets", "peakGuests", "tableMean", "waitedMean", "waitedMax", "refused", "cooledMax", "drinks"];

const seeds = Array.from({ length: days }, (_, i) => i + 1);
const t0 = performance.now();
const measures = seeds.map((seed) => dayMeasures(runDay({ seed, margin })));
const ms = (performance.now() - t0) / days;
const average = (read) => measures.reduce((total, one) => total + read(one), 0) / days;

for (const name of SUMMED) console.log(`${name.padEnd(12)} ${average((one) => one[name]).toFixed(1)}`);
const latest = measures.reduce((last, one) => (one.closedSeconds > last.closedSeconds ? one : last));
console.log(`\nfermé à       ${latest.closedAt} au plus tard, ${ms.toFixed(0)} ms par journée`);
console.log(`\ndéchets (kg)  biodéchets ${average((one) => one.waste.bio).toFixed(1)}, cartons ${average((one) => one.waste.emballages).toFixed(1)}, verre ${average((one) => one.waste.verre).toFixed(1)}, ordures ${average((one) => one.waste.ordures).toFixed(1)}`);
console.log(`biodéchets    ${average((one) => one.waste.bioPerGuest).toFixed(0)} g par client (source : 134), ${average((one) => one.waste.bags).toFixed(1)} sacs, ${average((one) => one.waste.full).toFixed(1)} bacs débordés`);
console.log(`bar           ${average((one) => one.bar.poured).toFixed(0)} verres, une tournée ${average((one) => one.bar.roundMean).toFixed(1)} min (${average((one) => one.bar.roundMax).toFixed(1)} au pire), ${average((one) => one.bar.short).toFixed(1)} manquants`);
const book = (read) => average((one) => read(one.bookings));
console.log(`carnet        ${book((b) => b.asked).toFixed(0)} demandes, ${book((b) => b.refused).toFixed(1)} refusées, ${book((b) => b.moved).toFixed(1)} déplacées, ${book((b) => b.written).toFixed(1)} écrites, ${book((b) => b.absent).toFixed(1)} absentes ; attente de sa table ${book((b) => b.waitMean).toFixed(1)} min (${book((b) => b.waitMax).toFixed(1)} au pire)`);
console.log(`sans résa     ${book((b) => b.barGuests).toFixed(1)} clients au bar, ${book((b) => b.barStay).toFixed(0)} min, jusqu'à ${book((b) => b.barPeak).toFixed(0)} debout, ${book((b) => b.walkInTables).toFixed(1)} tables prises, ${book((b) => b.barFull).toFixed(1)} groupes sans place`);
const made = (read) => average((one) => read(one.production));
console.log(`production    ${made((p) => p.covers).toFixed(1)} couverts prévus, ${made((p) => p.seated).toFixed(1)} à table ; ${made((p) => p.made).toFixed(0)} portions, ${made((p) => p.left).toFixed(1)} restes (${made((p) => p.leftShare).toFixed(1)} %), ${average((one) => one.refused).toFixed(2)} manquantes, ${measures.filter((one) => one.refused > 0).length} jours sur ${days} avec un manque`);
console.log(`réserves      il reste ${made((p) => p.stores.F).toFixed(1)} caisses de frais, ${made((p) => p.stores.T).toFixed(1)} de tempéré, ${made((p) => p.stores.G).toFixed(1)} d'épicerie`);
console.log(`table         remise en état en ${average((one) => one.tableTurnMean).toFixed(1)} min`);
console.log("\nposte  cases  pris au plus  plein pendant le service");
measures[0].stations.forEach((station, i) => console.log(`${station.kind.padEnd(6)} ${String(station.count).padEnd(6)} ${average((one) => one.stations[i].highest).toFixed(1).padEnd(13)} ${average((one) => one.stations[i].fullShare).toFixed(1)} %`));
console.log("\nqui             mètres  heures");
measures[0].staff.forEach((person, i) => console.log(`${person.name.padEnd(17)} ${average((one) => one.staff[i].metres).toFixed(0).padEnd(7)} ${average((one) => one.staff[i].worked).toFixed(1)}`));
