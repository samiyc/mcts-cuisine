import { keyOf } from "./service-basics.js";

/**
 * The cooks cross (Sami, 28/10/2026: `setup.crossing`, off by default): two cooks may stand on a cell of an aisle, as
 * one steps aside for the other, but a cell a station is worked from stays one cook's (a station is used by one at a
 * time). In an aisle of 1.07 m one cook works, two pass each other at 1.22 m (NKBA, docs/metiers.md); a cell ≈ a step.
 * The reservations' options (mcts-commun's `capacity` and `single`, asked by the kitchen and made the same day):
 * two cooks may also pass head on between two cells of an aisle; a cook parking keeps its cell alone. Before, the
 * aisles were `shared`, any number of cooks on a cell but no head-on pass.
 */
export function reservationsOf(kitchen, setup) {
  if (!setup.crossing) return {};
  const single = new Map(kitchen.stations.flatMap((station) => station.access.map((cell) => [keyOf(cell), cell])));
  return { capacity: 2, single: [...single.values()] };
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Is `cell` a wall for `unit` from step `t` on, for good: no floor, or another unit parked there by then? */
function walled({ kitchen, reservations }, cell, unit, t) {
  if (!kitchen.floor(kitchen.plan.at(cell.x, cell.y))) return true;
  const stay = reservations.stayAt(cell.x, cell.y);
  return Boolean(stay) && stay.unit !== unit && stay.from <= t;
}

/**
 * Is `cell` shut in for `cook` from the next step on, every side a wall for good (28/10/2026, the corridor: a cook in a
 * dead end, another parked at its mouth)? A cook shut in has no leg but to its own cell, a target shut in none but from
 * it: A* found none either, but after exploring every wait up to its horizon (60 000 of the corridor's 82 000 calls in
 * 2 services with the search, 55 cells each).
 */
const shut = (state, cell, cook, t) => STEPS.every(([dx, dy]) => walled(state, { x: cell.x + dx, y: cell.y + dy }, cook.id, t + 1));

/** No leg from `cook` to `target` but A* would search in vain: one of them shut in, `cook` not on `target`. */
export function shutOut(state, cook, target, t) {
  if (cook.x === target.x && cook.y === target.y) return false;
  return shut(state, cook, cook, t) || shut(state, target, cook, t);
}

