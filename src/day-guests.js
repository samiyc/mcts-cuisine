import { atTheCounter, barRound } from "./day-bar.js";
import { addPerson, addStock, at, gauge, mark, offer, segment, walkTo } from "./day-engine.js";
import { COURSES } from "./day-menu.js";
import { MINUTE } from "./day-program.js";
import { clearPass, fireCourse } from "./day-service.js";
import { EVENING, arrivals, orderOf } from "./day-stream.js";
import { layAll, placeOf, setState, turnTable } from "./day-tables.js";
import { LEFT, throwAway } from "./day-waste.js";

/**
 * The dining room (Sami, 1/11/2026, docs/journee.md: it is what makes the plan teem): groups come in by their door, have a drink
 * at the bar if no table is ready, sit, order, eat their courses, pay and leave. The waiters take the orders, bring the plates
 * from the pass, clear, and bring the dirty plates to the dish room. No published sequence was found: every duration is a
 * hypothesis (question 31); one waiter for 4 or 5 tables is a rule of thumb (OysterLink, docs/recherche/journee.md).
 */
export const FLOOR = Object.freeze({ waiters: 6, reading: 3, order: 60, serve: 20, pick: 10, clear: 30, drop: 10, bill: 60, leaving: 5, rack: 20, cleanPlates: 240 });
const PRIORITY = Object.freeze({ serve: 80, order: 60, bill: 50, clear: 40 });
const WAITER_FROM = 18 * 3600;
const COURSE_WORDS = Object.freeze({ entree: "l'entrée", plat: "le plat", dessert: "le dessert" });
const AROUND_BAR = 2;

/** The room as the evening begins: its tables, and the groups waiting at the bar. */
function roomOf(world) {
  return { tables: world.layout.tables.map((table) => ({ ...table, place: placeOf(world.layout, table), group: null, turns: 0, state: "bare", look: null })), line: [], waiting: 0, counter: counterOf(world.layout) };
}

/** The floor around the bar, where groups wait for a table, the nearest first. */
function counterOf(layout) {
  const { plan, stations } = layout;
  const near = (x, y) => stations.B.some((bar) => Math.abs(bar.x - x) + Math.abs(bar.y - y) <= AROUND_BAR);
  const cells = plan.lines.flatMap((line, y) => [...line].flatMap((char, x) => (char === "." && near(x, y) ? [{ x, y }] : [])));
  return cells.sort((a, b) => layout.steps(a, layout.entry) - layout.steps(b, layout.entry));
}

/** The guest `person` on a seat: their segment from now on. */
function sit(world, person, words) {
  segment(world, person, { kind: "sit", label: words, seat: person.seat });
}

/** Everyone of `group` is told what they are doing, on their seat. */
function allSit(world, group, words) {
  for (const person of group.members) sit(world, person, words);
}

/** A waiter's task for `group`, at its table. */
const atTable = (group, { seconds, label, carry = undefined, done = undefined }) => ({ station: group.table.place, seconds, label: `${label} (table ${group.table.id + 1})`, carry, done });

/** The waiter takes the order: the first course goes to the kitchen. */
function offerOrder(world, group) {
  allSit(world, group, "lit la carte");
  at(world, world.t + FLOOR.reading * MINUTE, () => {
    offer(world, {
      skill: "salle",
      priority: PRIORITY.order,
      legs: [atTable(group, { seconds: FLOOR.order, label: "prendre la commande", done: () => nextCourse(world, group, 0) })],
    });
  });
}

/** The group's course from `next` on: the first with something ordered; none left, the bill. A round from the bar goes with it. */
function nextCourse(world, group, next) {
  const course = COURSES[next];
  if (!course) return offerBill(world, group);
  const dishes = orderOf(world, course, group.size);
  if (!dishes.length) return nextCourse(world, group, next + 1);
  allSit(world, group, "attend son plat");
  barRound(world, { table: group.table, course, size: group.size });
  fireCourse(world, { table: group.table.id, course, dishes, then: (ticket) => offerServe(world, { group, ticket, next }) });
}

/** The chef has sent the plates: a waiter takes them from the pass to the table. */
function offerServe(world, { group, ticket, next }) {
  offer(world, {
    skill: "salle",
    priority: PRIORITY.serve,
    legs: [
      { at: "S", seconds: FLOOR.pick, label: `prendre les assiettes (table ${group.table.id + 1})`, carry: ticket.dishes[0].emoji, done: () => clearPass(world, ticket) },
      atTable(group, { seconds: FLOOR.serve, label: "servir", carry: null, done: () => eat(world, { group, ticket, next }) }),
    ],
  });
}

/** The group eats its course: plates on the seats, then cleared. */
function eat(world, { group, ticket, next }) {
  addStock(world, "propres", -ticket.dishes.length);
  const t1 = world.t + EVENING.eats[ticket.course] * MINUTE * (0.85 + 0.3 * world.rng.next());
  ticket.dishes.forEach((dish, i) => mark(world, group.members[i].seat, { emoji: dish.emoji, t1 }));
  allSit(world, group, `mange : ${COURSE_WORDS[ticket.course]}`);
  at(world, t1, () => offerClear(world, { group, ticket, next }));
}

/** A waiter clears the table, scrapes and brings the plates to the dish room; the next course may go. */
function offerClear(world, { group, ticket, next }) {
  allSit(world, group, "attend la suite");
  const plates = ticket.dishes.length;
  offer(world, {
    skill: "salle",
    priority: PRIORITY.clear,
    legs: [
      atTable(group, { seconds: FLOOR.clear, label: "débarrasser", carry: "🍽️", done: () => nextCourse(world, group, next + 1) }),
      { at: "L", seconds: FLOOR.drop, label: "poser à la plonge", carry: null, done: () => platesBack(world, plates) },
    ],
  });
}

/** Dirty plates at the dish room: scraped into the bins, washed by racks, back to the clean ones. */
function platesBack(world, count, glasses = 0) {
  addStock(world, "assiettes", count + glasses);
  throwAway(world, "bio", count * LEFT.plateScraps);
  throwAway(world, "ordures", count * LEFT.plateRest);
  if (!world.platesWashing) offerPlates(world);
}

function offerPlates(world) {
  const load = Math.min(FLOOR.rack, world.stock.get("assiettes"));
  world.platesWashing = true;
  offer(world, {
    skill: "plonge",
    priority: 65,
    legs: [
      { at: "L", seconds: 90, label: "laver un casier d'assiettes", carry: null, take: { assiettes: load } },
      { at: "r", seconds: 15, label: "ranger les assiettes", carry: "🍽️", put: { propres: load } },
      { at: "r", seconds: 1, label: "ranger les assiettes", carry: null },
    ],
    done: () => {
      world.platesWashing = false;
      if (world.stock.get("assiettes") > 0) offerPlates(world);
    },
  });
}

/** The bill, then the group leaves. */
function offerBill(world, group) {
  allSit(world, group, "demande l'addition");
  offer(world, {
    skill: "salle",
    priority: PRIORITY.bill,
    legs: [atTable(group, { seconds: FLOOR.bill, label: "porter l'addition", done: () => at(world, world.t + FLOOR.leaving * MINUTE, () => leave(world, group)) })],
  });
}

/** Everyone of the group walks to the door and out; the table's turn begins. */
function leave(world, group) {
  const { table } = group;
  world.log.push({ type: "group", id: group.id, size: group.size, seconds: world.t - group.seatedAt, waited: group.seatedAt - group.arrivedAt });
  for (const person of group.members) {
    person.cell = person.standing;
    walkTo(world, person, { cell: world.layout.entry, label: "s'en va" }, () => segment(world, person, { kind: "gone" }));
  }
  addStock(world, "clients", -group.size);
  addStock(world, "partis", group.size);
  turnTable(world, table, { guests: group.size, then: () => tableReady(world, table), glassesBack: (count) => platesBack(world, 0, count) });
}

/** A table laid: the first group in line takes it. */
function tableReady(world, table) {
  table.group = null;
  const { line } = world.room;
  const waiting = line.findIndex((group) => group.size <= table.seats.length);
  if (waiting >= 0) seat(world, line.splice(waiting, 1)[0], table);
}

/** The group walks to its table, each to a seat; all sat, they read the menu. */
function seat(world, group, table) {
  table.group = group;
  table.turns += 1;
  setState(world, table, "taken");
  group.table = table;
  group.seatedAt = world.t;
  let walking = group.members.length;
  group.members.forEach((person, i) => {
    person.seat = table.seats[i];
    person.carry = null;
    const station = world.layout.stations.s.find((one) => one.x === person.seat.x && one.y === person.seat.y);
    person.standing = world.layout.near(person.cell, station);
    walkTo(world, person, { cell: person.standing, label: "va à sa table" }, () => {
      sit(world, person, "s'installe");
      walking -= 1;
      if (!walking) offerOrder(world, group);
    });
  });
}

/** No table ready: the group waits around the bar, and has a drink. */
function toTheBar(world, group) {
  const { room } = world;
  room.line.push(group);
  group.members.forEach((person) => {
    const cell = room.counter[room.waiting % room.counter.length];
    room.waiting += 1;
    walkTo(world, person, { cell, label: "va au bar" }, () => segment(world, person, { kind: "wait", label: "attend une table au bar" }));
  });
  atTheCounter(world, group);
}

/** A group comes in: to a laid table, the least used first; or to the bar. */
function arrive(world, group) {
  group.arrivedAt = world.t;
  group.members = Array.from({ length: group.size }, (_, i) => addPerson(world, { name: `Client ${group.id + 1}.${i + 1}`, kind: "guest", group: group.id }, world.layout.entry));
  addStock(world, "clients", group.size);
  const free = world.room.tables.filter((table) => table.state === "laid" && !table.group && table.seats.length >= group.size).sort((a, b) => a.turns - b.turns)[0];
  if (free) seat(world, group, free);
  else toTheBar(world, group);
}

/** The waiters come in and lay the tables. */
function startWaiters(world) {
  for (let n = 0; n < FLOOR.waiters; n += 1) {
    const person = addPerson(world, { name: `Serveur ${n + 1}`, mark: `S${n + 1}`, kind: "waiter", skills: ["salle"] }, world.layout.entry);
    at(world, WAITER_FROM + n * 20, () => segment(world, person, { kind: "idle", label: "arrive" }));
  }
  at(world, WAITER_FROM + 2 * MINUTE, () => layAll(world, world.room.tables));
}

/** The evening of the dining room. */
export function startGuests(world) {
  world.room = roomOf(world);
  for (const name of ["bons", "envoyes", "epuises", "clients", "partis", "assiettes", "tables:pretes", "tables:sales"]) gauge(world, name, 0);
  addStock(world, "propres", FLOOR.cleanPlates);
  startWaiters(world);
  arrivals(world.rng).forEach((time, id) => {
    const group = { id, size: 2 + world.rng.int(3), table: null, members: [] };
    at(world, time, () => arrive(world, group));
  });
}
