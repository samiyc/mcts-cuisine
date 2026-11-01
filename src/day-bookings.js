import { HOUR, MINUTE } from "./day-program.js";

/**
 * The booking diary (Sami, 1/11/2026, docs/journee.md: bookings by slots, over several services and hours). Requests for a
 * slot are written in the diary before the day: each takes a table free for the slot and the time a table is kept, the slot
 * asked or the nearest of its service, or is turned down. Some tables stay unbooked, for those who come without a booking, and
 * some of the booked never come.
 *
 * Sources (docs/recherche/journee.md): slots 15 minutes apart, two services with fixed arrival times (Wix, Formitable, Aleno);
 * 20 to 30 % of the tables kept for walk-ins (OpenTable); one booking in seven not honoured (a Zonal/CGA study cited by Combo,
 * not checked). The hours, the requests and the lateness are hypotheses (question 37).
 */
export const BOOKING = Object.freeze({
  services: Object.freeze([
    Object.freeze({ label: "premier service", slots: Object.freeze([19, 19.25, 19.5, 19.75].map((hour) => hour * HOUR)), share: 0.55 }),
    Object.freeze({ label: "second service", slots: Object.freeze([21, 21.25, 21.5].map((hour) => hour * HOUR)), share: 0.45 }),
  ]),
  requests: 30,
  /** How long a table is kept for a booking: about the time at table, and its turn after. */
  block: 105 * MINUTE,
  walkInTables: 4,
  noShow: 1 / 7,
  /** How long an absent group's table is held past its slot. */
  held: 20 * MINUTE,
  early: 5 * MINUTE,
  late: 15 * MINUTE,
});

/** Can `table` take a booking at `slot`, its other bookings a whole block away? */
const freeAt = (table, slot) => table.slots.every((other) => Math.abs(other - slot) >= BOOKING.block);

/** The slots to try for one asked: the slot itself, then the others of its service, nearest first; then the other service's. */
function slotsToTry(service, asked) {
  const near = (slots) => slots.toSorted((a, b) => Math.abs(a - asked) - Math.abs(b - asked));
  const other = BOOKING.services.find((one) => one !== service);
  return [...near(service.slots), ...near(other.slots)];
}

/** A table and a slot for a request, the fullest table that can take it (so the free ones stay whole); null if none can. */
function placeFor(tables, service, asked) {
  for (const slot of slotsToTry(service, asked)) {
    const fit = tables.filter((table) => freeAt(table, slot)).sort((a, b) => b.slots.length - a.slots.length || a.id - b.id)[0];
    if (fit) return { table: fit, slot };
  }
  return null;
}

/** One request, written in the diary or turned down. */
function request(rng, tables, id) {
  const service = rng.next() < BOOKING.services[0].share ? BOOKING.services[0] : BOOKING.services[1];
  const asked = service.slots[rng.int(service.slots.length)];
  const size = 2 + rng.int(3);
  const lateBy = -BOOKING.early + rng.next() * (BOOKING.early + BOOKING.late);
  const noShow = rng.next() < BOOKING.noShow;
  const place = placeFor(tables, service, asked);
  if (!place) return { id, size, asked, refused: true };
  place.table.slots.push(place.slot);
  return { id, size, asked, slot: place.slot, table: place.table.id, service: place.slot >= BOOKING.services[1].slots[0] ? 1 : 0, arrivesAt: place.slot + lateBy, noShow, arrivedAt: null, seatedAt: null, leftAt: null, released: false };
}

/** The day's diary for `tableCount` tables, the last ones kept for those without a booking. */
export function bookTables(rng, tableCount) {
  const booked = tableCount - BOOKING.walkInTables;
  const tables = Array.from({ length: booked }, (_, id) => ({ id, slots: [] }));
  return Array.from({ length: BOOKING.requests }, (_, id) => request(rng, tables, id));
}

/** Is `table` free of any booking still to come, for the time a group stays, from `t` on? */
export function openFor(bookings, tableId, t) {
  return bookings.every((one) => one.table !== tableId || one.walkIn || one.released || one.arrivedAt !== null || one.slot >= t + BOOKING.block);
}
