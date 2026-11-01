import { dayLayout } from "./day-plan.js";
import { BRIGADE, DELIVERY, MINUTE, PHASES, START } from "./day-program.js";
import { addPerson, addStock, at, createWorld, offer, runWorld, segment } from "./day-engine.js";
import { MENU } from "./day-menu.js";
import { startPhases } from "./day-phases.js";
import { startProduction } from "./day-production.js";
import { startWaste } from "./day-waste.js";
import { startBar } from "./day-bar.js";
import { startBody } from "./day-body.js";
import { startClosing } from "./day-closing.js";
import { startGuests } from "./day-guests.js";

/**
 * A whole day of the showcase (Sami, 1/11/2026, docs/journee.md): the kitchen's day played once, from a seed, by simple
 * rules; what comes out is a trace (`runDay`), replayed by the page (day-scene.js, web/tabs/day.js).
 */

const BRIEFING = 5 * MINUTE;

/** A crate of `lot`: from the truck to its store. */
function crateTask(world, lot) {
  return {
    label: `ranger ${lot.label}`,
    skill: "prep",
    priority: lot.priority,
    legs: [
      { at: "K", seconds: DELIVERY.take, label: `décharger ${lot.label}`, carry: lot.emoji, take: { camion: 1 } },
      { at: lot.store, seconds: DELIVERY.put, label: `ranger ${lot.label}`, carry: null, put: { [lot.store]: 1 } },
    ],
    done: () => afterTheTruck(world),
  };
}

/** The check of `lot` at the truck, by one who can refuse it: its crates may then be put away. */
function controlTask(world, lot) {
  return {
    label: `contrôler ${lot.label}`,
    skill: "control",
    priority: lot.priority + 5,
    legs: [{ at: "K", seconds: DELIVERY.control, label: `contrôler ${lot.label}` }],
    done: () => {
      for (let crate = 0; crate < lot.crates; crate += 1) offer(world, crateTask(world, lot));
    },
  };
}

/** The last crate put away: the chef's briefing at the pass, everyone there, then the day's production. */
function afterTheTruck(world) {
  world.crates -= 1;
  if (world.crates > 0) return;
  let left = world.staff.length;
  for (const person of world.staff) {
    offer(world, {
      who: person.id,
      priority: 90,
      legs: [{ at: "S", seconds: BRIEFING, label: "le briefing du chef" }],
      done: () => {
        left -= 1;
        if (!left) startProduction(world);
      },
    });
  }
}

/** The truck at the dock: its lots to check, the cold first. */
function receive(world) {
  world.crates = DELIVERY.lots.reduce((sum, lot) => sum + lot.crates, 0);
  addStock(world, "camion", world.crates);
  for (const lot of DELIVERY.lots) {
    addStock(world, lot.store, 0);
    offer(world, controlTask(world, lot));
  }
}

/** The brigade comes in by the back door, one after the other. */
function arrive(world, layout) {
  BRIGADE.forEach((spec, i) => {
    const person = addPerson(world, { ...spec, kind: "cook" }, layout.back);
    at(world, START + i * 15, () => segment(world, person, { kind: "idle", label: "arrive" }));
  });
}

/** The trace of a world played: what the page and the tests read. */
function traceOf(world) {
  return { layout: world.layout, phases: PHASES, start: START, end: world.end, people: world.people, gauges: world.gauges, marks: world.marks, uses: world.uses, log: world.log, bookings: world.bookings };
}

/**
 * The day on the plan `text`, from `seed`. Throws, in French, on a plan it cannot play.
 * @param {{ text?: string, seed?: number }} [options]
 */
export function runDay({ text, seed = 1 } = {}) {
  const layout = dayLayout(text);
  const world = createWorld(layout, seed);
  arrive(world, layout);
  startWaste(world);
  receive(world);
  startPhases(world, { dishes: MENU, brigade: BRIGADE });
  startGuests(world);
  startBar(world);
  startBody(world);
  startClosing(world);
  return traceOf(runWorld(world));
}
