import { addStock, at, mark, offer } from "./day-engine.js";
import { MINUTE } from "./day-program.js";
import { dirtyPan } from "./day-production.js";

/**
 * The day's service in the kitchen (Sami, 1/11/2026, docs/journee.md): a ticket is a table's course. Each dish comes out of
 * its fridge, is warmed or finished (a warming goes on alone on its stove or in its oven until it is taken off, once, as
 * the rule asks: docs/recherche/journee.md), plated, set on the pass. All the plates of a ticket there, the chef checks
 * them and sends them: `then(ticket)` calls the dining room. The oldest ticket first (`urgency`).
 */
const FROM_FRIDGE = 20;
const TAKE_OFF = 30;
const TO_PASS = 10;
const CHECK = 30;
const BASE = Object.freeze({ dish: 70, hot: 75, check: 90 });

/** A task's priority: a thousandth of a level per second, so an older ticket comes first, a little before the nearest. */
const urgency = (world, base, ticket) => base + (ticket.number === undefined ? 0 : -ticket.openedAt / 3600);

const fromFridge = (dish) => ({ at: dish.fridge, seconds: FROM_FRIDGE, label: `sortir ${dish.label}`, carry: dish.emoji });

/** The legs from a plate to the pass: plating, then setting it down. */
function plateLegs(world, ticket, dish) {
  const plating = dish.service.at(-1);
  return [
    { at: plating.at, seconds: plating.seconds, label: `dresser ${dish.label}`, carry: dish.emoji },
    { at: "S", seconds: TO_PASS, label: `au passe : ${dish.label}`, carry: null, done: (station) => plated(world, { ticket, dish, station }) },
  ];
}

/** Warmed or cooked: someone takes it off and plates it. */
function offerFinish(world, { ticket, dish, station }) {
  offer(world, {
    skill: dish.service.at(-1).skill,
    priority: urgency(world, BASE.hot, ticket),
    legs: [{ station, seconds: TAKE_OFF, label: `retirer ${dish.label}`, carry: dish.emoji }, ...plateLegs(world, ticket, dish)],
  });
}

/** A dish of a ticket: from the fridge to the stove or straight to the plate. */
function fireDish(world, ticket, dish) {
  const [first] = dish.service;
  if (!first.alone) {
    const watched = dish.service.slice(0, -1).map((step) => ({ at: step.at, seconds: step.seconds, label: `${step.do} ${dish.label}`, carry: null }));
    offer(world, { skill: first.skill, priority: urgency(world, BASE.dish, ticket), legs: [fromFridge(dish), ...watched, ...plateLegs(world, ticket, dish)] });
    return;
  }
  const put = {
    at: first.at,
    seconds: first.seconds,
    label: `${first.do} ${dish.label}`,
    carry: null,
    keep: true,
    done: (station) => {
      const t1 = world.t + first.alone.min * MINUTE;
      mark(world, station, { emoji: first.alone.emoji, t1 });
      dirtyPan(world);
      at(world, t1, () => offerFinish(world, { ticket, dish, station }));
    },
  };
  offer(world, { skill: first.skill, priority: urgency(world, BASE.dish, ticket), legs: [fromFridge(dish), put] });
}

/** A plate on the pass: shown until sent; all there, the chef is called. */
function plated(world, { ticket, dish, station }) {
  ticket.plates.push(mark(world, station, { emoji: dish.emoji }));
  if (ticket.plates.length < ticket.dishes.length) return;
  offer(world, { skill: "passe", priority: BASE.check, legs: [{ at: "S", seconds: CHECK, label: `contrôler la table ${ticket.table + 1}`, done: () => sendTicket(world, ticket) }] });
}

/** The chef has checked: the ticket's time is measured, and the dining room is called. */
function sendTicket(world, ticket) {
  ticket.sentAt = world.t;
  addStock(world, "bons", -1);
  addStock(world, "envoyes", ticket.dishes.length);
  world.log.push({ type: "ticket", table: ticket.table, course: ticket.course, dishes: ticket.dishes.length, seconds: world.t - ticket.openedAt, t: world.t });
  ticket.then(ticket);
}

/** The plates of `ticket` leave the pass. */
export function clearPass(world, ticket) {
  for (const plate of ticket.plates) plate.t1 = world.t;
}

/** A table's course comes into the kitchen: `{ table, course, dishes, then }`. */
export function fireCourse(world, course) {
  const ticket = { ...course, number: world.ticketCount, openedAt: world.t, plates: [], sentAt: null };
  world.ticketCount += 1;
  addStock(world, "bons", 1);
  for (const dish of course.dishes) fireDish(world, ticket, dish);
  return ticket;
}
