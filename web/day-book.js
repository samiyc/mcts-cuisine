import { clockOf } from "../src/day-scene.js";
import { svg } from "./dom.js";

/**
 * The booking diary drawn (Sami, 1/11/2026, docs/journee.md): one row a table, the evening's hours across. Each booking is a
 * block in its group's colour, the colour of its guests on the plan: an outline while it is to come, filling up as the group is
 * at its table; struck through when nobody came. Those who sat without a booking are drawn the same, in a dashed outline.
 */
const WIDTH = 1000;
const LEFT = 44;
const TOP = 18;
const ROW = 15;
const FROM = 18.5 * 3600;
const TO = 24.5 * 3600;
const LENGTH = 105 * 60;

const xOf = (t) => LEFT + ((Math.min(TO, Math.max(FROM, t)) - FROM) / (TO - FROM)) * (WIDTH - LEFT);
const hueOf = (id) => (id * 47) % 360;

/** The hours along the top, every half an hour. */
function hours(root, height) {
  for (let t = FROM; t <= TO; t += 1800) {
    const x = xOf(t);
    root.append(svg("line", { x1: x, x2: x, y1: TOP - 4, y2: height, class: t % 3600 ? "book-tick half" : "book-tick" }));
    if (t % 3600 === 0) root.append(svg("text", { x, y: 11, class: "book-hour" }, clockOf(t)));
  }
}

/** The rows' names. */
function rows(root, tables) {
  tables.forEach((table, i) => root.append(svg("text", { x: 2, y: TOP + i * ROW + 11, class: "book-row" }, `Table ${table.id + 1}`)));
}

const words = (one) => `Table ${one.table + 1}, ${clockOf(one.slot)}, ${one.size} couverts${one.walkIn ? ", sans réservation" : ""}${one.noShow ? " : personne n'est venu" : ""}`;

/** A block of the diary, and what fills it as time goes. */
function block(root, one) {
  const y = TOP + one.table * ROW + 2;
  const x = xOf(one.slot);
  const width = xOf(one.slot + LENGTH) - x;
  const hue = hueOf(one.id);
  const outline = svg("rect", { x, y, width, height: ROW - 4, rx: 3, class: `book-block${one.walkIn ? " walk-in" : ""}${one.noShow ? " absent" : ""}`, style: `stroke: hsl(${hue} 55% 45%)` });
  outline.append(svg("title", {}, words(one)));
  const fill = svg("rect", { x, y, width: 0, height: ROW - 4, rx: 3, class: "book-fill", style: `fill: hsl(${hue} 55% 62%)` });
  root.append(fill, outline);
  if (one.noShow) root.append(svg("line", { x1: x, x2: x + width, y1: y + (ROW - 4) / 2, y2: y + (ROW - 4) / 2, class: "book-strike" }));
  return { one, fill };
}

/** The diary of `trace`, and how to bring it to the time shown. */
export function createBook(trace) {
  const { tables } = trace.layout;
  const height = TOP + tables.length * ROW + 2;
  const root = svg("svg", { viewBox: `0 0 ${WIDTH} ${height}`, class: "day-book", role: "img", "aria-label": "Le carnet de réservations, table par table, heure par heure" });
  hours(root, height);
  rows(root, tables);
  const blocks = trace.bookings.filter((one) => !one.refused).map((one) => block(root, one));
  const cursor = svg("line", { x1: 0, x2: 0, y1: TOP - 6, y2: height, class: "book-cursor" });
  root.append(cursor);
  return {
    root,
    draw(t) {
      cursor.setAttribute("x1", String(xOf(t)));
      cursor.setAttribute("x2", String(xOf(t)));
      for (const { one, fill } of blocks) {
        if (one.seatedAt === null || t < one.seatedAt) fill.setAttribute("width", "0");
        else fill.setAttribute("width", String(Math.max(0, xOf(Math.min(t, one.leftAt ?? t)) - xOf(one.seatedAt))));
        if (one.seatedAt !== null) fill.setAttribute("x", String(xOf(one.seatedAt)));
      }
    },
  };
}
