import { clockOf } from "./day-scene.js";

/**
 * What a day came to (Sami, 1/11/2026, docs/journee.md): the guests and the plates, the tickets' times, the tables, how far
 * and how much each one worked, where the stations filled up. Read from the trace, nothing more.
 */
const SERVICE = Object.freeze({ from: 19 * 3600, to: 22.5 * 3600 });
const sum = (values) => values.reduce((total, value) => total + value, 0);
const mean = (values) => (values.length ? sum(values) / values.length : 0);
const minutes = (seconds) => seconds / 60;
const round = (value) => Math.round(value * 10) / 10;

/** The value at `share` of the sorted `values`. */
function quantile(values, share) {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] : 0;
}

/** The share of the service during which a kind of station was all taken, and its highest use. */
function fullness(trace, kind) {
  const series = trace.gauges[`pris:${kind}`] ?? [];
  const count = trace.layout.stations[kind].length;
  let full = 0;
  series.forEach(([t, value], i) => {
    const next = series[i + 1]?.[0] ?? t;
    const overlap = Math.max(0, Math.min(next, SERVICE.to) - Math.max(t, SERVICE.from));
    if (value >= count) full += overlap;
  });
  return { kind, count, highest: Math.max(0, ...series.map((entry) => entry[1])), fullShare: round((100 * full) / (SERVICE.to - SERVICE.from)) };
}

/** What each of the staff did: metres walked, hours worked. */
const staffOf = (people) =>
  people
    .filter((person) => person.skills)
    .map((person) => ({ name: person.name, kind: person.kind, metres: person.walked, worked: round(person.worked / 3600) }));

/** The day's measures. */
export function dayMeasures(trace) {
  const tickets = trace.log.filter((one) => one.type === "ticket").map((one) => one.seconds);
  const groups = trace.log.filter((one) => one.type === "group");
  const final = (name) => trace.gauges[name]?.at(-1)?.[1] ?? 0;
  const peak = (name) => Math.max(0, ...(trace.gauges[name] ?? []).map((entry) => entry[1]));
  return {
    guests: final("partis"),
    tables: groups.length,
    plates: final("envoyes"),
    tickets: tickets.length,
    ticketMean: round(minutes(mean(tickets))),
    ticketP90: round(minutes(quantile(tickets, 0.9))),
    ticketMax: round(minutes(Math.max(0, ...tickets))),
    peakTickets: peak("bons"),
    peakGuests: peak("clients"),
    tableMean: round(minutes(mean(groups.map((one) => one.seconds)))),
    waitedMean: round(minutes(mean(groups.map((one) => one.waited)))),
    waitedMax: round(minutes(Math.max(0, ...groups.map((one) => one.waited)))),
    refused: final("epuises"),
    cooledMax: round(minutes(Math.max(0, ...trace.log.filter((one) => one.type === "cooled").map((one) => one.seconds)))),
    drinks: trace.log.filter((one) => one.type === "drink").length,
    closedAt: clockOf(trace.end),
    stations: ["P", "A", "_", "S", "C", "Z", "L"].map((kind) => fullness(trace, kind)),
    staff: staffOf(trace.people),
  };
}
