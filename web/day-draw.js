import { STATION_NAMES } from "../src/day-plan.js";
import { svg } from "./dom.js";

/**
 * The day's plan drawn (Sami, 1/11/2026, docs/journee.md: as visual as the urgences' big hospital): the plan once, its
 * rooms tinted and named; then, each frame, only the people and what lies on the cells. A person's mark is kept from a
 * frame to the next and moved, so a hundred people on the plan stay fluid.
 */
const CELL = 26;
const ICONS = { K: "🚚", F: "🥩", T: "🥔", G: "🥫", C: "🔪", P: "🔥", A: "♨️", M: "🥧", Z: "❄️", f: "🧊", d: "🍰", _: "🍽️", S: "🛎️", L: "🧽", r: "🍽️", B: "🍷", w: "💧", D: "🚪", x: "🚪", g: "🚪", y: "🌳" };
const CLASSES = { "#": "wall", K: "truck", y: "yard", t: "table", s: "seat", b: "seat", F: "cold", Z: "cold", f: "cold", d: "cold", P: "hot", A: "hot", T: "store", G: "store", S: "pass", L: "wash", r: "wash", w: "water" };
/** Tells the cook's marks apart at a glance, by their job. */
const BODY_FROM = 0.45;

const centre = (cell) => (cell + 0.5) * CELL;
const middleOf = (cells) => cells.reduce((sum, value) => sum + value, 0) / cells.length;

/** Which class a cell is drawn with. */
const classOf = (char) => CLASSES[char] ?? (ICONS[char] ? "station" : "floor");

/** One cell of the plan: its tile and its icon. */
function cellMarks(root, { char, x, y }) {
  if (char === " ") return;
  root.append(svg("rect", { x: x * CELL + 0.5, y: y * CELL + 0.5, width: CELL - 1, height: CELL - 1, rx: 3, class: `day-cell ${classOf(char)}` }));
  if (ICONS[char]) root.append(svg("text", { x: centre(x), y: centre(y) + 5, class: "day-icon" }, ICONS[char]));
}

/** The name of a kind of station, once, over the middle of its cells. */
function nameOf(root, plan, kind) {
  const cells = plan.find(kind);
  if (!cells.length) return;
  const [x, y] = [middleOf(cells.map((cell) => cell.x)), middleOf(cells.map((cell) => cell.y))];
  root.append(svg("text", { x: centre(x), y: centre(y) + 4, class: "day-name" }, STATION_NAMES[kind].replace(/^(les|le|la|l') ?/, "")));
}

const SEEN_NAMES = ["F", "T", "G", "b"];

/** The plan's still part. */
export function planBackground(layout) {
  const { plan } = layout;
  const root = svg("g", { class: "day-plan" });
  plan.lines.forEach((line, y) => [...line].forEach((char, x) => cellMarks(root, { char, x, y })));
  for (const kind of SEEN_NAMES) nameOf(root, plan, kind);
  return root;
}

/** A new mark for `person`: their shape, their ring for thirst and fatigue, their letters, what they carry. */
function personMark(person) {
  const group = svg("g", { class: `day-person ${person.kind}`, "data-who": String(person.id) });
  const radius = person.kind === "guest" ? 7 : 11;
  group.append(svg("circle", { r: radius, class: "body", style: person.kind === "guest" ? `fill: hsl(${(person.group * 47) % 360} 55% 62%)` : null }));
  if (person.mark) group.append(svg("text", { y: 4, class: "letters" }, person.mark));
  group.append(svg("text", { x: 9, y: -7, class: "carry" }, ""));
  return group;
}

/** How someone feels, as a class of their ring: the worse of their thirst and their fatigue. */
export function moodOf(person) {
  const worst = Math.max(person.thirst, person.fatigue);
  if (worst >= 0.8) return "bad";
  return worst >= BODY_FROM ? "low" : "fine";
}

/** Spreads the people who stand on one cell, so a crowd still shows. */
function spotter() {
  const crowd = new Map();
  return ({ x, y }) => {
    const key = `${Math.round(x)},${Math.round(y)}`;
    const n = crowd.get(key) ?? 0;
    crowd.set(key, n + 1);
    return { x: centre(x) + [0, 8, -8, 0, 8, -8][n % 6], y: centre(y) + [0, 0, 0, 7, 7, 7][n % 6] };
  };
}

/** Moves the marks to the scene's `people`: new ones added, those gone taken away. */
function drawPeople(layer, marks, people) {
  const spot = spotter();
  const here = new Set();
  for (const person of people) {
    here.add(person.id);
    if (!marks.has(person.id)) marks.set(person.id, layer.appendChild(personMark(person)));
    const mark = marks.get(person.id);
    const { x, y } = spot(person);
    mark.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    mark.dataset.mood = moodOf(person);
    mark.lastChild.textContent = person.carry ?? "";
  }
  for (const [id, mark] of marks) {
    if (here.has(id)) continue;
    mark.remove();
    marks.delete(id);
  }
}

/** What lies on the cells: pots, pans, plates. Redrawn only when it changes. */
function drawMarks(layer, scene) {
  const words = scene.marks.map((one) => `${one.x},${one.y},${one.emoji}`).join(";");
  if (layer.dataset.words === words) return;
  layer.dataset.words = words;
  layer.replaceChildren(...scene.marks.map((one) => svg("text", { x: centre(one.x), y: centre(one.y) + 6, class: "day-on" }, one.emoji)));
}

/** The plan of `layout` drawn, and how to bring it to a scene. */
export function createPlan(layout) {
  const { plan } = layout;
  const root = svg("svg", { viewBox: `0 0 ${plan.width * CELL} ${plan.height * CELL}`, class: "day-board", role: "img", "aria-label": "La journée de la cuisine : la brigade, ses postes et, le soir, la salle" });
  const on = svg("g", {});
  const people = svg("g", {});
  root.append(planBackground(layout), on, people);
  const marks = new Map();
  return {
    root,
    draw(scene) {
      drawMarks(on, scene);
      drawPeople(people, marks, scene.people);
    },
  };
}
