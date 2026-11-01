import { at, offer, segment } from "./day-engine.js";
import { MENU, portionsOf } from "./day-menu.js";
import { BRIGADE, MINUTE } from "./day-program.js";

/**
 * The end of the day (Sami, 1/11/2026, docs/journee.md: once the rush is over, put away, clean, the dish room, check the
 * fridges): what is left labelled and put away, every station wiped, the floor mopped, each store's and fridge's temperature
 * written down, then everyone out, the waiters by the guests' door, the cooks by the back. The list follows the closing
 * checklists (Toast, docs/recherche/journee.md); its durations are hypotheses (question 33).
 */
const CHECKED_FROM = 22.5 * 3600;
const WIPED = Object.freeze(["C", "P", "A", "M", "Z", "_", "S"]);
const WIPE = 3 * MINUTE;
const CHECK_EVERY = 60;
const MOPPED_ROWS = 4;
const MOP_STOP = 40;

/** A floor cell as somewhere to work from. */
const floorPlace = (cell) => ({ ...cell, kind: "floor", key: `floor:${cell.x},${cell.y}`, access: [cell] });

/** One of the kitchen's aisles to mop, end to end: the free rows between the stations, in reading order. */
function aisles(layout) {
  const { plan } = layout;
  const rows = [];
  for (let y = 0; y < layout.stations.S[0].y; y += 1) {
    const cells = plan.lines[y].split("").flatMap((char, x) => (char === "." ? [{ x, y }] : []));
    if (cells.length > plan.width * 0.8) rows.push(cells);
  }
  return rows.slice(0, MOPPED_ROWS);
}

/** Every task of the closing, each `{ skill, priority, legs }`. */
function closingTasks(world) {
  const { layout, stock } = world;
  const leftovers = MENU.filter((dish) => stock.get(portionsOf(dish)) > 0).map((dish) => ({
    skill: "prep",
    priority: 30,
    legs: [
      { at: "_", seconds: MINUTE, label: `rassembler : ${dish.label}`, carry: dish.emoji },
      { at: dish.fridge, seconds: MINUTE, label: `étiqueter et ranger : ${dish.label}`, carry: null },
    ],
  }));
  const wiped = WIPED.flatMap((kind) => layout.stations[kind].map(() => ({ skill: "prep", priority: 20, legs: [{ at: kind, seconds: WIPE, label: "nettoyer le poste", carry: null }] })));
  const checks = ["F", "T", "f", "d"].map((kind) => ({ skill: "control", priority: 25, legs: [{ at: kind, seconds: 2 * MINUTE, label: "relever la température", carry: null }] }));
  const mop = aisles(layout).map((cells) => ({ skill: "prep", priority: 10, legs: [cells[0], cells.at(-1)].map((cell) => ({ station: floorPlace(cell), seconds: MOP_STOP, label: "laver le sol", carry: "🧹" })) }));
  return [...leftovers, ...checks, ...wiped, ...mop];
}

/** `person` leaves by `cell`, once they have nothing else to do. */
function offerLeave(world, person, cell) {
  offer(world, {
    who: person.id,
    priority: 1,
    legs: [{ station: floorPlace(cell), seconds: 5, label: "s'en va", carry: null }],
    done: () => {
      person.off = true;
      at(world, world.t, () => segment(world, person, { kind: "gone" }));
    },
  });
}

/** Every closing task done: the brigade goes home by the back door. */
function goHome(world, cooks) {
  for (const person of cooks) offerLeave(world, person, world.layout.back);
  world.log.push({ type: "closed", t: world.t });
}

/** The guests gone: the closing's tasks, everyone back to their whole skills. */
function close(world) {
  const cooks = world.staff.filter((person) => person.kind === "cook");
  cooks.forEach((person, i) => {
    person.skills = BRIGADE[i].skills;
  });
  for (const person of world.staff.filter((one) => one.kind === "waiter")) offerLeave(world, person, world.layout.entry);
  const tasks = closingTasks(world);
  let left = tasks.length;
  for (const task of tasks) {
    offer(world, {
      ...task,
      done: () => {
        left -= 1;
        if (!left) goHome(world, cooks);
      },
    });
  }
}

/** The closing starts once the last guest has gone and no ticket is open, from 22 h 30 on. */
function closeWhenEmpty(world) {
  const guestsLeft = world.people.some((person) => person.kind === "guest" && person.track.at(-1)?.kind !== "gone");
  if (guestsLeft || world.stock.get("bons") > 0) return at(world, world.t + CHECK_EVERY, () => closeWhenEmpty(world));
  close(world);
}

export function startClosing(world) {
  at(world, CHECKED_FROM, () => closeWhenEmpty(world));
}
