import { BOOKING } from "./day-bookings.js";
import { COURSES, MENU } from "./day-menu.js";
import { EVENING } from "./day-stream.js";

/**
 * How much the kitchen makes (Sami, 1/11/2026, docs/journee.md: the production follows the diary): the covers expected from
 * the bookings written, less the absences to expect, plus those who usually sit without a booking; then each course's portions
 * by the share of guests who order it, with a margin, in whole batches.
 *
 * The method: prep quantities come from expected covers and sales history (Taqtics, Operandio, docs/recherche/journee.md). The
 * margin of 25 % is Operandio's rule of thumb (a vendor's, nothing independent found); the walk-ins' covers and the take-up of
 * each course are the house's history, hypotheses here (question 39). The kitchen knows the rate of absences, never who.
 */
export const FORECAST = Object.freeze({ walkInCovers: 10, margin: 0.25 });

/** Each dish of `course` in whole batches, at least one, the dish with the fewest portions added to until `need` is met. */
function batchesOf(course, need) {
  const dishes = MENU.filter((dish) => dish.course === course).map((dish) => ({ dish, batches: 1 }));
  const made = (one) => one.batches * one.dish.portions;
  const total = () => dishes.reduce((sum, one) => sum + made(one), 0);
  while (total() < need) dishes.reduce((low, one) => (made(one) < made(low) ? one : low)).batches += 1;
  return dishes.map((one) => [one.dish.id, one.batches]);
}

/**
 * The covers to expect from the diary, and the batches to make for them, with `margin`.
 * @param {readonly any[]} bookings
 * @param {number} [margin]
 */
export function dayForecast(bookings, margin = FORECAST.margin) {
  const booked = bookings.filter((one) => !one.refused).reduce((sum, one) => sum + one.size, 0);
  const absent = Math.round(booked * BOOKING.noShow);
  const covers = booked - absent + FORECAST.walkInCovers;
  const portions = Object.fromEntries(COURSES.map((course) => [course, Math.ceil(covers * EVENING.wants[course] * (1 + margin))]));
  const batches = Object.fromEntries(COURSES.flatMap((course) => batchesOf(course, portions[course])));
  return { booked, absent, walkIns: FORECAST.walkInCovers, covers, margin, portions, batches };
}
