import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DAY_PLAN, dayLayout } from "../src/day-plan.js";
import { MENU, portionsOf } from "../src/day-menu.js";
import { DELIVERY, WALK } from "../src/day-program.js";
import { runDay } from "../src/day.js";
import { clockOf, sceneAt } from "../src/day-scene.js";

const SEEDS = [1, 2, 3];
const days = new Map();
const dayOf = (seed) => {
  if (!days.has(seed)) days.set(seed, runDay({ seed }));
  return days.get(seed);
};

/** The showcase's day (docs/journee.md, Sami 1/11/2026): what must hold whatever the seed. */
describe("the plan of the day (src/day-plan.js)", () => {
  it("has every line the same width, and every station reached from the dock", () => {
    const widths = new Set(DAY_PLAN.split("\n").map((line) => line.length));
    assert.equal(widths.size, 1, `largeurs : ${[...widths]}`);
    const layout = dayLayout();
    for (const station of Object.values(layout.stations).flat()) assert.ok(station.access.some((cell) => layout.steps(layout.dock, cell) >= 0), station.key);
    assert.equal(layout.tables.length, 16);
    assert.ok(layout.tables.every((table) => table.seats.length === 4));
  });

  it("keeps one path for each pair of cells, and walks it on the floor", () => {
    const layout = dayLayout();
    const path = layout.pathOf(layout.back, layout.entry);
    assert.equal(layout.pathOf(layout.back, layout.entry), path);
    assert.deepEqual(path.at(-1), layout.entry);
    for (const cell of path) assert.ok(".Dxyg".includes(layout.plan.at(cell.x, cell.y)), `${cell.x},${cell.y}`);
  });

  it("refuses, in French, a plan it cannot play", () => {
    assert.throws(() => dayLayout(DAY_PLAN.replaceAll("Z", ".")), /la cellule de refroidissement/);
    assert.throws(() => dayLayout(DAY_PLAN.replace("##########DD####", "################")), /quai/);
  });
});

describe("the day (src/day.js)", () => {
  it("plays the same from the same seed", () => {
    const tracks = (day) => JSON.stringify(day.people.map((person) => person.track));
    assert.equal(tracks(runDay({ seed: 1 })), tracks(dayOf(1)));
  });

  for (const seed of SEEDS) {
    it(`puts one person at a time at a station (seed ${seed})`, () => {
      const byStation = Map.groupBy(dayOf(seed).uses, (use) => use.key);
      for (const [key, uses] of byStation) {
        const sorted = uses.toSorted((a, b) => a.t0 - b.t0);
        sorted.slice(1).forEach((use, i) => assert.ok(use.t0 >= sorted[i].t1, `${key} : ${sorted[i].who} et ${use.who}`));
      }
    });

    it(`puts away every crate of the truck, the stock never below zero (seed ${seed})`, () => {
      const { gauges } = dayOf(seed);
      assert.equal(gauges.camion.at(-1)[1], 0);
      for (const lot of DELIVERY.lots) assert.ok(gauges[lot.store].some(([, value]) => value === lot.crates), lot.label);
      for (const [name, series] of Object.entries(gauges)) assert.ok(series.every(([, value]) => value >= 0), name);
    });

    it(`makes every batch ahead, cooled within the 2 hours (seed ${seed})`, () => {
      const { gauges, log } = dayOf(seed);
      for (const dish of MENU) assert.equal(gauges[portionsOf(dish)].at(-1)[1], dish.batches * dish.portions, dish.id);
      const cooled = log.filter((one) => one.type === "cooled");
      assert.equal(cooled.length, MENU.filter((dish) => dish.chain.some((step) => step.chill)).reduce((sum, dish) => sum + dish.batches, 0));
      for (const one of cooled) assert.ok(one.seconds <= 2 * 3600, `${one.dish} : ${one.seconds} s`);
    });

    it(`keeps everyone on the floor as they walk (seed ${seed})`, () => {
      const { layout, people } = dayOf(seed);
      for (const part of people.flatMap((person) => person.track).filter((one) => one.path)) {
        part.path.forEach((cell) => assert.ok(layout.steps(cell, layout.dock) >= 0, `${cell.x},${cell.y}`));
      }
    });
  }
});

describe("the scene of the day (src/day-scene.js)", () => {
  it("shows nobody before the day, then someone walking between two cells", () => {
    const day = dayOf(1);
    assert.equal(sceneAt(day, day.start - 1).people.length, 0);
    const walker = day.people.find((person) => person.track.some((part) => part.path?.length > 2));
    const part = walker.track.find((one) => one.path?.length > 2);
    const seen = sceneAt(day, part.t0 + WALK / 2).people.find((one) => one.id === walker.id);
    const [a, b] = part.path;
    assert.deepEqual([seen.x, seen.y], [(a.x + b.x) / 2, (a.y + b.y) / 2]);
    assert.equal(seen.doing, "walk");
  });

  it("gives the clock and the phase", () => {
    assert.equal(clockOf(20 * 3600 + 5 * 60), "20 h 05");
    const day = dayOf(1);
    assert.equal(sceneAt(day, 8.5 * 3600).phase.id, "reception");
    assert.equal(sceneAt(day, 20 * 3600).phase.id, "service");
  });
});
