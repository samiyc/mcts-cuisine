import { clockOf } from "./day-scene.js";

/**
 * What a day came to (Sami, 1/11/2026, docs/journee.md): the guests and the plates, the tickets' times, the tables, how far
 * and how much each one worked, where the stations filled up. Read from the trace, nothing more.
 */
const SERVICE = Object.freeze({ from: 19 * 3600, to: 23 * 3600 });
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

/** The waste taken out, in kilos by stream; the biowaste a guest; the bins that overflowed; the bags. */
function wasteOf(trace, final) {
  const kilos = (stream) => round(final(`local:${stream}`) / 1000);
  const bags = trace.log.filter((one) => one.type === "bag");
  return { bio: kilos("bio"), emballages: kilos("emballages"), verre: kilos("verre"), ordures: kilos("ordures"), bioPerGuest: Math.round(final("local:bio") / Math.max(1, sum(trace.log.filter((one) => one.type === "group").map((one) => one.size)))), bags: bags.length, full: trace.log.filter((one) => one.type === "binFull").length };
}

/** The bar: the glasses poured, how long a round waited, what was missing. */
function barOf(trace) {
  const rounds = trace.log.filter((one) => one.type === "round").map((one) => one.seconds);
  const poured = trace.log.filter((one) => one.type === "drinks");
  return { poured: sum(poured.map((one) => one.count)), short: sum(poured.map((one) => one.short)), roundMean: round(minutes(mean(rounds))), roundMax: round(minutes(Math.max(0, ...rounds))) };
}

/** The diary: what was asked, refused, written, honoured; how long a booked group waited for its table; the walk-ins. */
function bookingsOf(trace) {
  const asked = trace.bookings.filter((one) => !one.walkIn);
  const written = asked.filter((one) => !one.refused);
  const came = written.filter((one) => !one.noShow);
  const waits = came.map((one) => one.seatedAt - one.arrivedAt);
  const barGroups = trace.log.filter((one) => one.type === "barGroup");
  return {
    asked: asked.length,
    refused: asked.length - written.length,
    written: written.length,
    absent: written.length - came.length,
    moved: written.filter((one) => one.slot !== one.asked).length,
    waitMean: round(minutes(mean(waits))),
    waitMax: round(minutes(Math.max(0, ...waits))),
    walkInTables: trace.log.filter((one) => one.type === "walkInTable").length,
    barGroups: barGroups.length,
    barGuests: sum(barGroups.map((one) => one.size)),
    barStay: round(minutes(mean(barGroups.map((one) => one.seconds)))),
    barFull: trace.log.filter((one) => one.type === "barFull").length,
    barPeak: Math.max(0, ...(trace.gauges["bar:debout"] ?? []).map((entry) => entry[1])),
  };
}

/** How long each table took from its group's leaving to laid again. */
function turnsOf(trace) {
  const dirtyAt = new Map();
  const turns = [];
  for (const one of trace.log.filter((entry) => entry.type === "table")) {
    if (one.state === "dirty") dirtyAt.set(one.table, one.t);
    if (one.state === "laid" && dirtyAt.has(one.table)) turns.push(one.t - dirtyAt.get(one.table));
  }
  return turns;
}

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
    waste: wasteOf(trace, final),
    bar: barOf(trace),
    bookings: bookingsOf(trace),
    tableTurnMean: round(minutes(mean(turnsOf(trace)))),
    closedAt: clockOf(trace.end),
    closedSeconds: trace.end,
    stations: ["P", "A", "_", "S", "C", "Z", "L"].map((kind) => fullness(trace, kind)),
    staff: staffOf(trace.people),
  };
}
