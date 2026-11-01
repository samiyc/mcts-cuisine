import { addStock } from "./day-engine.js";
import { MENU, portionsOf } from "./day-menu.js";

/**
 * What the evening asks of the kitchen (Sami, 1/11/2026, docs/journee.md): what each guest orders of a course, and how long a
 * course is eaten. Hypotheses: question 31.
 */
export const EVENING = Object.freeze({ wants: Object.freeze({ entree: 0.7, plat: 1, dessert: 0.6 }), eats: Object.freeze({ entree: 12, plat: 20, dessert: 12 }) });

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
