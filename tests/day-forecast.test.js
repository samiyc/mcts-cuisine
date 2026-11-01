import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { COURSES, MENU, portionsOf } from "../src/day-menu.js";
import { dayForecast, FORECAST } from "../src/day-forecast.js";
import { dayMeasures } from "../src/day-measures.js";
import { DELIVERY } from "../src/day-program.js";
import { runDay } from "../src/day.js";

const diary = (count, size = 3) => Array.from({ length: count }, (_, id) => ({ id, size, refused: false, noShow: false }));
const madeOf = (course, batches) => MENU.filter((dish) => dish.course === course).reduce((sum, dish) => sum + batches[dish.id] * dish.portions, 0);

describe("the production follows the diary", () => {
  it("counts the bookings written, less the absences to expect, plus the usual walk-ins", () => {
    const forecast = dayForecast([...diary(14), { id: 99, size: 4, refused: true }]);
    assert.equal(forecast.booked, 42);
    assert.equal(forecast.absent, 6);
    assert.equal(forecast.covers, 36 + FORECAST.walkInCovers);
  });

  it("knows how many will be absent, never who", () => {
    const flagged = diary(14).map((one, i) => ({ ...one, noShow: i < 7 }));
    assert.deepEqual(dayForecast(flagged), dayForecast(diary(14)));
  });

  it("makes each course's portions, in whole batches, no batch too many", () => {
    for (const count of [0, 8, 16, 24]) {
      const { portions, batches } = dayForecast(diary(count));
      for (const course of COURSES) {
        const made = madeOf(course, batches);
        const dishes = MENU.filter((dish) => dish.course === course);
        assert.ok(made >= portions[course], `${course} : ${made} pour ${portions[course]}`);
        assert.ok(dishes.every((dish) => batches[dish.id] >= 1), course);
        const oneLess = made - Math.min(...dishes.filter((dish) => batches[dish.id] > 1).map((dish) => dish.portions));
        assert.ok(oneLess < portions[course] || dishes.every((dish) => batches[dish.id] === 1), `${course} : un lot de trop`);
      }
    }
  });

  it("makes more with more bookings and with a wider margin", () => {
    const portionsAt = (count, margin) => Object.values(dayForecast(diary(count), margin).portions).reduce((sum, value) => sum + value, 0);
    assert.ok(portionsAt(24, 0.25) > portionsAt(12, 0.25));
    assert.ok(portionsAt(12, 0.25) > portionsAt(12, 0));
  });

  it("needs no more crates than the truck brings, even with a full diary of the largest tables", () => {
    const { batches } = dayForecast(diary(24, 4));
    const crates = { F: 0, T: 0, G: 0 };
    for (const dish of MENU) {
      for (const step of dish.chain) {
        for (const [store, count] of Object.entries(step.fetch ?? {})) crates[store] += count * batches[dish.id];
      }
    }
    for (const lot of DELIVERY.lots) assert.ok(crates[lot.store] <= lot.crates, `${lot.store} : ${crates[lot.store]} caisses pour ${lot.crates}`);
  });

  for (const seed of [1, 2, 3]) {
    it(`a day makes what its forecast says, and every portion is sold or left (seed ${seed})`, () => {
      const trace = runDay({ seed });
      for (const dish of MENU) assert.equal(Math.max(...trace.gauges[portionsOf(dish)].map(([, value]) => value)), trace.forecast.batches[dish.id] * dish.portions, dish.id);
      const { production, plates } = dayMeasures(trace);
      assert.equal(production.made - production.left, plates);
    });
  }

  it("takes its margin from the day asked, and a wider one leaves more", () => {
    const leftAt = (margin) => dayMeasures(runDay({ seed: 1, margin })).production.left;
    assert.equal(runDay({ seed: 1, margin: 0 }).forecast.margin, 0);
    assert.ok(leftAt(0.5) > leftAt(0));
  });
});
