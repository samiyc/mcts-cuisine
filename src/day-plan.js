import { createDistances, parsePlan } from "mcts-commun/grid.js";

/**
 * The plan of the showcase's day (Sami, 1/11/2026, docs/journee.md: a first draft he will square up himself), drawn as
 * text like the kitchens. Its legend has its own letters: the day is a model apart from the service's.
 *
 * Where one walks: `.` the floor, `D` the dock's door, `x` the back door, `y` the yard behind, `g` the guests' door.
 * Stations, each worked by one person at a time from a floor cell beside it: `K` the truck, `F` the cold room's shelves,
 * `T` the tempered store, `G` the tins and cereals, `C` a board, `P` a stove, `A` an oven, `M` the pastry bench, `Z` a
 * blast chiller, `f` a fridge of dishes, `d` a fridge of desserts, `_` a plating bench, `S` the pass, `L` a sink, `r` the
 * clean plates, `w` a water tap, `b` a seat of the staff room, `s` a guest's seat, `t` a table (not worked: its seats are).
 * `#` a wall, a space outside the building.
 */
export const DAY_PLAN = [
  "     KKKKKKKKKK                  yyyyyyyyyyy  ",
  "     ..........                  yyyyyyyyyyy  ",
  "##########DD##########################x#######",
  "#FFFFFFFF#..#TTTTTTTT#GGGGGGGG#.............w#",
  "#...........#........#........#..bbbbbbbbbb..#",
  "#FFFFFFFF#..#TTTT.TTT#GGGG.GGG#..............#",
  "##########..#####.########.####..............#",
  "#............................................#",
  "#..CCCCCC...PPPPPPPP.AAAA...MMMMMM..dddddd...#",
  "#............................................#",
  "#..CCCCCC...PPPPPPPP.AAAA...MMMMMM..ZZZZZZ...#",
  "#............................................#",
  "#..ffffff...________.ffff...______..LLLLrr...#",
  "#............................................#",
  "######.#w###SSSSSSSSSSSSSSSS###w#####.########",
  "#............................................#",
  "#..ss...ss...ss...ss...ss...ss...ss...ss.....#",
  "#..tt...tt...tt...tt...tt...tt...tt...tt.....#",
  "#..ss...ss...ss...ss...ss...ss...ss...ss.....#",
  "#............................................#",
  "#..ss...ss...ss...ss...ss...ss...ss...ss.....#",
  "#..tt...tt...tt...tt...tt...tt...tt...tt.....#",
  "#..ss...ss...ss...ss...ss...ss...ss...ss.....#",
  "#............................................#",
  "######################g#######################",
].join("\n");

const WALKED = new Set([".", "D", "x", "y", "g"]);
/** What each station's letter is, for the page and for a plan refused. */
export const STATION_NAMES = Object.freeze({
  K: "le camion",
  F: "la chambre froide",
  T: "le stock tempéré",
  G: "les conserves et céréales",
  C: "les planches",
  P: "les fourneaux",
  A: "les fours",
  M: "la pâtisserie",
  Z: "la cellule de refroidissement",
  f: "les frigos de plats",
  d: "les frigos à desserts",
  _: "le dressage",
  S: "le passe",
  L: "la plonge",
  r: "les assiettes propres",
  w: "les points d'eau",
  b: "la salle du personnel",
  s: "les chaises",
});
const DOORS = Object.freeze({ D: "le quai", x: "la porte arrière", y: "la cour", g: "la porte des clients" });
const SIDES = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
const keyOf = (cell) => `${cell.x},${cell.y}`;

/** The cells beside `cell` that one can walk on. */
const accessOf = (plan, cell) => SIDES.map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy })).filter((side) => WALKED.has(plan.at(side.x, side.y)));

/** The stations of `plan`, by letter: each `{ x, y, kind, key, access }`. */
function stationsOf(plan) {
  const stations = {};
  for (const kind of Object.keys(STATION_NAMES)) stations[kind] = plan.find(kind).map((cell) => ({ ...cell, kind, key: keyOf(cell), access: accessOf(plan, cell) }));
  return stations;
}

/** The tables: each pair of `t` side by side, with the seats above and below it, numbered in reading order. */
function tablesOf(plan, seats) {
  const tables = [];
  for (const cell of plan.find("t")) {
    if (plan.at(cell.x - 1, cell.y) === "t") continue;
    const near = seats.filter((seat) => Math.abs(seat.y - cell.y) === 1 && seat.x >= cell.x && seat.x <= cell.x + 1);
    tables.push({ id: tables.length, x: cell.x, y: cell.y, seats: near });
  }
  return tables;
}

/** A plan refused: what is missing or cannot be reached, in French, for the page. */
function refusal(plan, stations, steps) {
  for (const [kind, name] of Object.entries(STATION_NAMES)) if (!stations[kind].length) return `il manque ${name} (« ${kind} »)`;
  for (const [door, name] of Object.entries(DOORS)) if (!plan.find(door).length) return `il manque ${name} (« ${door} »)`;
  const [dock] = plan.find("D");
  const shut = Object.values(stations)
    .flat()
    .find((station) => !station.access.some((cell) => steps(dock, cell) >= 0));
  return shut ? `${STATION_NAMES[shut.kind]} (« ${shut.kind} », ligne ${shut.y + 1}, colonne ${shut.x + 1}) : on n'y accède pas depuis le quai` : null;
}

const layouts = new Map();

/** The plan `text` read once, its distances and paths shared by every day on it. Throws, in French, on a plan it cannot play. */
export function dayLayout(text = DAY_PLAN) {
  if (!layouts.has(text)) layouts.set(text, readLayout(text));
  return layouts.get(text);
}

function readLayout(text) {
  const plan = parsePlan(text);
  const distances = createDistances(plan, (char) => WALKED.has(char));
  const steps = (from, to) => distances.to(to)[from.y * plan.width + from.x];
  const stations = stationsOf(plan);
  const problem = refusal(plan, stations, steps);
  if (problem) throw new Error(problem);
  const paths = new Map();
  const pathOf = (from, to) => {
    const key = `${keyOf(from)}>${keyOf(to)}`;
    if (!paths.has(key)) paths.set(key, Object.freeze(walked(plan, distances.to(to), from)));
    return paths.get(key);
  };
  const near = (from, station) => station.access.reduce((best, cell) => (reachBetter(steps(from, cell), steps(from, best)) ? cell : best));
  return { plan, text, stations, steps, pathOf, near, paths, tables: tablesOf(plan, stations.s), dock: plan.find("D")[0], back: plan.find("x")[0], yard: plan.find("y"), entry: plan.find("g")[0] };
}

/** Is a walk of `steps` better than one of `best`, −1 being out of reach? */
const reachBetter = (steps, best) => steps >= 0 && (best < 0 || steps < best);

/** The cells from `from` down `field` to its target (both included), by the first nearer side in a fixed order. */
function walked(plan, field, from) {
  const path = [from];
  let { x, y } = from;
  for (let left = field[y * plan.width + x]; left > 0; left -= 1) {
    const [dx, dy] = SIDES.find(([a, b]) => plan.inside(x + a, y + b) && field[(y + b) * plan.width + x + a] === left - 1);
    x += dx;
    y += dy;
    path.push({ x, y });
  }
  return path;
}
