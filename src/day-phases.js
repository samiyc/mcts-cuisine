import { at, offer } from "./day-engine.js";
import { HOUR, MINUTE } from "./day-program.js";

/**
 * The turns of the day that are not orders (Sami, 1/11/2026, docs/journee.md): the mise en place, everyone to their post.
 * Hypotheses: question 25.
 */
const CLEANED = Object.freeze(["C", "P", "M", "_"]);
const GARNISHES = Object.freeze({ count: 24, minutes: 12 });
const TO_POST = Object.freeze({ passe: "S", chaud: "P", froid: "_", patisserie: "M", plonge: "L", prep: "_" });

/** The boards, stoves, pastry and plating benches wiped, one station at a time. */
function intermediateCleaning(world) {
  for (const kind of CLEANED) {
    for (let n = 0; n < world.layout.stations[kind].length; n += 1) offer(world, { skill: "prep", priority: 15, legs: [{ at: kind, seconds: 40, label: "nettoyer le poste", carry: null }] });
  }
}

/** A dish's trays taken from the fridge to the plating bench, ready for the service. */
function traysToPost(world, dishes) {
  for (const dish of dishes) {
    offer(world, {
      skill: "prep",
      priority: 20,
      legs: [
        { at: dish.fridge, seconds: 30, label: `sortir les bacs : ${dish.label}`, carry: dish.emoji },
        { at: "_", seconds: 90, label: `installer les bacs : ${dish.label}`, carry: null },
      ],
    });
  }
}

/** The small preparations of each post, by hand, for the service. */
function garnishes(world) {
  for (let n = 0; n < GARNISHES.count; n += 1) offer(world, { skill: "prep", priority: 18, legs: [{ at: n % 2 ? "C" : "_", seconds: GARNISHES.minutes * MINUTE, label: "préparer les garnitures et les sauces", carry: null }] });
}

/** Everyone to their post, their service's skills on. */
function toPosts(world, brigade) {
  world.staff.filter((person) => person.kind === "cook").forEach((person, i) => {
    const { service } = brigade[i];
    person.skills = service;
    offer(world, { who: person.id, priority: 85, legs: [{ at: TO_POST[service[0]], seconds: 2 * MINUTE, label: "se mettre en place" }] });
  });
}

/** The day's turns, each at its hour. */
export function startPhases(world, { dishes, brigade }) {
  at(world, 16.5 * HOUR, () => {
    intermediateCleaning(world);
    traysToPost(world, dishes);
    garnishes(world);
  });
  at(world, 18.5 * HOUR, () => toPosts(world, brigade));
}
