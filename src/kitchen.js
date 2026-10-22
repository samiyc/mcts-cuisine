import { parsePlan } from "mcts-commun/grid.js";

/**
 * A kitchen read from its plan (kitchens.js): the floor, each station (crate, board, stove, pass) with the
 * floor cells a cook works it from, and where the robots and the human start. Static: what moves is in
 * simulate.js.
 */
const FLOOR = new Set([".", "R", "H"]);
export const STATIONS = Object.freeze({ o: "caisse d'oignons", t: "caisse de tomates", C: "planche", P: "fourneau", S: "passe", _: "comptoir" });
/** The stations every kitchen needs (a counter is optional). */
const REQUIRED = ["o", "t", "C", "P", "S"];
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** The kitchen of `text`: `{ plan, floor(char), stations: [{ x, y, kind, access }], robots, human }`. */
export function readKitchen(text) {
  const plan = parsePlan(text);
  const stations = [];
  for (let y = 0; y < plan.height; y += 1) {
    for (let x = 0; x < plan.width; x += 1) {
      const kind = plan.at(x, y);
      if (!STATIONS[kind]) continue;
      const access = SIDES.map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter((cell) => FLOOR.has(plan.at(cell.x, cell.y)));
      stations.push({ x, y, kind, access });
    }
  }
  const robots = plan.find("R");
  const [human] = plan.find("H");
  for (const kind of REQUIRED) {
    if (!stations.some((station) => station.kind === kind && station.access.length > 0)) throw new Error(`il manque une ${STATIONS[kind]} accessible (${kind})`);
  }
  if (!human) throw new Error("le plan n'a pas de place pour le cuisinier humain (H)");
  return { plan, floor: (char) => FLOOR.has(char), stations, robots, human };
}

/** Floor distances from `from` (a breadth-first search): a Map "x,y" → steps. */
export function distancesFrom(kitchen, from) {
  const distances = new Map([[`${from.x},${from.y}`, 0]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    const cell = queue[i];
    for (const [dx, dy] of SIDES) {
      const next = { x: cell.x + dx, y: cell.y + dy };
      const key = `${next.x},${next.y}`;
      if (!kitchen.floor(kitchen.plan.at(next.x, next.y)) || distances.has(key)) continue;
      distances.set(key, distances.get(`${cell.x},${cell.y}`) + 1);
      queue.push(next);
    }
  }
  return distances;
}
