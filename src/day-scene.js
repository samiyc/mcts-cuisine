import { MENU } from "./day-menu.js";
import { WALK } from "./day-program.js";

/**
 * What the day shows at second `t` of its trace (day.js, Sami 1/11/2026): pure, for the page and the tests. Everyone
 * where their track puts them, between two cells while they walk; the gauges; what lies on the cells.
 */

/** The last entry of `list` whose time (`timeOf`) is at or before `t`, or null. */
function lastBefore(list, t, timeOf) {
  let low = 0;
  let high = list.length - 1;
  let found = null;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (timeOf(list[middle]) <= t) {
      found = list[middle];
      low = middle + 1;
    } else high = middle - 1;
  }
  return found;
}

const startOf = (part) => part.t0;

/** Where someone walking is: between two cells of the path. */
function along(part, t) {
  const last = part.path.length - 1;
  const done = Math.min(last, (t - part.t0) / WALK);
  const step = Math.floor(done);
  const [from, to] = [part.path[step], part.path[Math.min(last, step + 1)]];
  return { x: from.x + (to.x - from.x) * (done - step), y: from.y + (to.y - from.y) * (done - step) };
}

/** Where a segment puts someone at `t`: along their walk, on their seat, or where they stand. */
function placeOf(part, t) {
  if (part.kind === "walk") return along(part, t);
  const { x, y } = part.seat ?? part;
  return { x, y };
}

/** Someone at `t`: their mark and where they are, or null before their first segment and once gone. */
function personAt(person, t) {
  const part = lastBefore(person.track, t, startOf);
  if (!part || part.kind === "gone") return null;
  return { id: person.id, name: person.name, mark: person.mark, kind: person.kind, group: person.group, ...placeOf(part, t), doing: part.kind, label: part.label, carry: part.carry, thirst: part.thirst ?? 0, fatigue: part.fatigue ?? 0 };
}

/** A gauge's value at `t`: its last value by then, 0 before. */
export const gaugeAt = (series, t) => lastBefore(series ?? [], t, (entry) => entry[0])?.[1] ?? 0;

/** The phase at `t`. */
export const phaseAt = (phases, t) => lastBefore(phases, t, (phase) => phase.from) ?? phases[0];

/** The clock's words for second `t` of the day, past midnight too: « 20 h 05 », « 0 h 14 ». */
export function clockOf(t) {
  const minutes = Math.floor(t / 60);
  return `${Math.floor(minutes / 60) % 24} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** The portions in the fridges by `course` (entrees and mains together), from each dish's gauge. */
function portionsAt(trace, t, dishes) {
  return dishes.reduce((sum, dish) => sum + gaugeAt(trace.gauges[`plat:${dish.id}`], t), 0);
}

/** The scene at `t`: `{ t, clock, phase, people, marks, gauges }`. */
export function sceneAt(trace, t) {
  return {
    t,
    clock: clockOf(t),
    phase: phaseAt(trace.phases, t),
    people: trace.people.map((person) => personAt(person, t)).filter(Boolean),
    marks: trace.marks.filter((one) => one.t0 <= t && t < (one.t1 ?? Infinity)),
    gauges: {
      ...Object.fromEntries(Object.entries(trace.gauges).map(([name, series]) => [name, gaugeAt(series, t)])),
      plats: portionsAt(trace, t, MENU.filter((dish) => dish.fridge === "f")),
      desserts: portionsAt(trace, t, MENU.filter((dish) => dish.fridge === "d")),
    },
  };
}
