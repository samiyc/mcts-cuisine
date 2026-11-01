import { at, offer } from "./day-engine.js";
import { BRIGADE, HOUR, MINUTE } from "./day-program.js";

/**
 * The body in the day (Sami, 1/11/2026, docs/journee.md: a colour for the cooks who are thirsty or tired, a back door to
 * take a break outside). Thirst climbs twice as fast at a stove or an oven, fatigue with the hours and the thirst; a tired
 * cook's gestures last longer. **All of it is a hypothesis** (questions 29 and 30): the sources ask for water at hand, breaks
 * in the cool and turns off the hot line (Food Alert, Shield Safety, docs/recherche/journee.md), without a figure.
 * The 15 minutes outside are Sami's; the law's 20 minutes after 6 hours are what the team's meal stands for.
 */
export const BODY = Object.freeze({ thirstHours: 2, fatigueHours: 20, slower: 0.25, drinkAt: 0.6, drinkInRush: 0.85, drink: 30, breakMinutes: 15, breakRest: 0.15, mealRest: 0.2 });
const RUSH = Object.freeze({ from: 19.5 * HOUR, to: 22 * HOUR });
/** The first break, and the time between two people's: two by two through the middle of the day. */
const BREAKS = Object.freeze({ from: 11.5 * HOUR, every: 25 * MINUTE });
const MEAL = Object.freeze({ cook: 16.5 * HOUR, at: 17.5 * HOUR, minutes: 30 });

/** `person`'s thirst and fatigue brought up to now, from what they did since. */
function bring(world, person) {
  const dt = world.t - (person.bodyAt ?? world.t);
  person.bodyAt = world.t;
  person.thirst = Math.min(1, (person.thirst ?? 0) + (dt / (BODY.thirstHours * HOUR)) * (person.hot ? 2 : 1));
  person.fatigue = Math.min(1, (person.fatigue ?? 0) + (dt / (BODY.fatigueHours * HOUR)) * (1 + person.thirst));
}

const rested = (person, rest) => {
  person.fatigue = Math.max(0, person.fatigue - rest);
};

const inRush = (t) => t >= RUSH.from && t < RUSH.to;

/** Free and thirsty: `person` goes to the nearest tap (a cook in the rush holds out longer). */
function maybeDrink(world, person) {
  if (person.kind !== "cook" || person.drinking) return;
  bring(world, person);
  if (person.thirst < (inRush(world.t) ? BODY.drinkInRush : BODY.drinkAt)) return;
  person.drinking = true;
  offer(world, {
    who: person.id,
    priority: 88,
    legs: [
      {
        at: "w",
        seconds: BODY.drink,
        label: "boit",
        done: () => {
          person.thirst = 0;
          person.drinking = false;
          world.log.push({ type: "drink", who: person.id, t: world.t });
        },
      },
    ],
  });
}

/** A cell of the yard as somewhere to stand, for one person. */
const yardPlace = (world, i) => {
  const { yard } = world.layout;
  const cell = yard[(i * 7) % yard.length];
  return { ...cell, kind: "yard", key: `yard:${i}`, access: [cell] };
};

/** `person`'s break: through the back door, 15 minutes in the yard. */
function offerBreak(world, person, i) {
  offer(world, {
    who: person.id,
    priority: 87,
    legs: [
      {
        station: yardPlace(world, i),
        seconds: BODY.breakMinutes * MINUTE,
        label: "pause dehors",
        carry: null,
        done: () => {
          rested(person, BODY.breakRest);
          person.thirst = 0;
          world.log.push({ type: "break", who: person.id, t: world.t });
        },
      },
    ],
  });
}

/** The team's meal: one of the commis cooks it, and everyone sits down. */
function teamMeal(world, cooks) {
  const cook = cooks.find((person) => person.mark === "C2");
  at(world, MEAL.cook, () => {
    offer(world, { who: cook.id, priority: 50, legs: [{ at: "T", seconds: 30, label: "chercher pour le repas d'équipe", carry: "📦" }, { at: "P", seconds: 35 * MINUTE, label: "cuisiner le repas d'équipe", carry: null }, { at: "b", seconds: 60, label: "mettre la table de l'équipe" }] });
  });
  at(world, MEAL.at, () => {
    for (const person of cooks) {
      offer(world, { who: person.id, priority: 89, legs: [{ at: "b", seconds: MEAL.minutes * MINUTE, label: "repas d'équipe", carry: null, done: () => { rested(person, BODY.mealRest); person.thirst = 0; } }] });
    }
  });
}

/** The body's part of the day: thirst and fatigue on every segment, the breaks, the meal. */
export function startBody(world) {
  world.body = {
    now(person) {
      if (person.kind !== "cook") return {};
      bring(world, person);
      return { thirst: person.thirst, fatigue: person.fatigue };
    },
    pace: (person) => (person.kind === "cook" ? 1 + BODY.slower * (person.fatigue ?? 0) : 1),
    free: (person) => maybeDrink(world, person),
  };
  const cooks = world.staff.filter((person) => person.kind === "cook" && BRIGADE.some((spec) => spec.mark === person.mark));
  cooks.forEach((person, i) => at(world, BREAKS.from + Math.floor(i / 2) * BREAKS.every, () => offerBreak(world, person, i)));
  teamMeal(world, cooks);
}
