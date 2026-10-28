import { distancesFrom } from "./kitchen.js";
import { keyOf } from "./service-basics.js";

/**
 * The cooks cross (Sami, 28/10/2026: `setup.crossing`, off by default): the floor's cells are shared, as a cook steps
 * aside in an aisle, but the cells a station is worked from stay one cook's (a station is used by one at a time). In
 * an aisle of 1.07 m one cook works, two pass each other at 1.22 m (NKBA, docs/metiers.md); a cell ≈ a step. The
 * reservations hold any number of cooks on a shared cell (mcts-commun's `shared`); two at most is asked of mcts-commun.
 * A head-on swap stays forbidden: one waits a step on the other's cell, and they pass.
 */
export function sharedCells(kitchen, setup) {
  if (!setup.crossing) return [];
  const work = new Set(kitchen.stations.flatMap((station) => station.access.map(keyOf)));
  const { plan } = kitchen;
  const cells = [];
  for (let y = 0; y < plan.height; y += 1) {
    for (let x = 0; x < plan.width; x += 1) if (kitchen.floor(plan.at(x, y)) && !work.has(keyOf({ x, y }))) cells.push({ x, y });
  }
  return cells;
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** The first side of `cell` one step nearer `target` (`distances` from it) that `unit` may step on at `t`. */
function nextStep(reservations, cell, distances, unit) {
  const toward = distances.get(keyOf(cell)) - 1;
  for (const [dx, dy] of STEPS) {
    const next = { x: cell.x + dx, y: cell.y + dy, t: cell.t + 1 };
    if (distances.get(keyOf(next)) === toward && reservations.isFree(next.x, next.y, next.t, unit) && !reservations.swaps(cell, next, cell.t, unit)) return next;
  }
  return null;
}

/**
 * A leg's path straight down the floor's distances to `target`, without A* (28/10/2026; every leg since Sami's
 * choice of 28/10, the cooks crossing or not): null when a step is taken (a cook's cell, a station's, a swap) or the
 * target is not free from the arrival on, and A* plans it then. Each A* call explored 9 to 15 cells, but a search made
 * some 120 000 a service: their fixed cost, not the collisions, was the time. A shortest path like A*'s, but not always
 * the same one where two are as short: the fingerprints of 28/10.
 */
export function directPath({ kitchen, reservations }, cook, target, start) {
  const distances = distancesFrom(kitchen, target);
  if (!distances.has(keyOf(cook))) return null;
  const path = [{ x: cook.x, y: cook.y, t: start }];
  while (distances.get(keyOf(path.at(-1))) > 0) {
    const next = nextStep(reservations, path.at(-1), distances, cook.id);
    if (!next) return null;
    path.push(next);
  }
  return reservations.freeFrom(target.x, target.y, path.at(-1).t, cook.id) ? path : null;
}
