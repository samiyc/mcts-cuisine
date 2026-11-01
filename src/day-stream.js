import { addStock, at, gauge } from "./day-engine.js";
import { COURSES, MENU, portionsOf } from "./day-menu.js";
import { HOUR, MINUTE } from "./day-program.js";
import { clearPass, fireCourse } from "./day-service.js";

/**
 * What the dining room asks of the kitchen, before its guests are drawn (Sami, 1/11/2026, docs/journee.md, step 3): groups
 * come through the evening, most of them around 20 h 15, and order their courses one after the other. Hypotheses: question 31.
 */
export const EVENING = Object.freeze({ groups: 32, from: 19 * HOUR, peak: 20.25 * HOUR, to: 21.5 * HOUR, wants: Object.freeze({ entree: 0.7, plat: 1, dessert: 0.6 }), eats: Object.freeze({ entree: 12, plat: 20, dessert: 12 }) });

/** When the groups come: a triangular draw between the first and the last, peaking at `peak`. */
export function arrivals(rng, { groups, from, peak, to } = EVENING) {
  const split = (peak - from) / (to - from);
  const draw = () => {
    const u = rng.next();
    return u < split ? from + Math.sqrt(u * (to - from) * (peak - from)) : to - Math.sqrt((1 - u) * (to - from) * (to - peak));
  };
  return Array.from({ length: groups }, draw).sort((a, b) => a - b);
}

/** A guest's dish of `course`: among those left, the one drawn, its portion set aside; null when none is left (counted). */
export function chooseDish(world, course) {
  const left = MENU.filter((dish) => dish.course === course && world.stock.get(portionsOf(dish)) > 0);
  if (!left.length) {
    addStock(world, "epuises", 1);
    return null;
  }
  const dish = left[world.rng.int(left.length)];
  addStock(world, portionsOf(dish), -1);
  return dish;
}

/** What a group of `size` orders for `course`: each guest who wants one, a dish. */
export function orderOf(world, course, size) {
  const dishes = [];
  for (let guest = 0; guest < size; guest += 1) {
    if (world.rng.next() >= EVENING.wants[course]) continue;
    const dish = chooseDish(world, course);
    if (dish) dishes.push(dish);
  }
  return dishes;
}

/** A group's courses from the `next`, each after the last is eaten. */
function nextCourse(world, group, next) {
  const course = COURSES[next];
  if (!course) return;
  const dishes = orderOf(world, course, group.size);
  if (!dishes.length) return nextCourse(world, group, next + 1);
  fireCourse(world, {
    table: group.id,
    course,
    dishes,
    then: (ticket) => {
      clearPass(world, ticket);
      at(world, world.t + EVENING.eats[course] * MINUTE, () => nextCourse(world, group, next + 1));
    },
  });
}

/** The groups of the evening. */
export function startStream(world) {
  gauge(world, "bons", 0);
  gauge(world, "envoyes", 0);
  gauge(world, "epuises", 0);
  arrivals(world.rng).forEach((time, id) => {
    const group = { id, size: 2 + world.rng.int(3) };
    at(world, time, () => nextCourse(world, group, 0));
  });
}
