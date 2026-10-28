import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resetTrace, traceSnapshot } from "mcts-commun/trace.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { keyOf } from "../src/service-basics.js";
import { reservationsOf } from "../src/service-crossing.js";
import { createService, drawOrders, isOver, stepService } from "../src/simulate.js";
import { TABLES } from "../src/service-tables.js";

/** The cooks cross (Sami, 28/10/2026: src/service-crossing.js): two cooks to an aisle's cell, a station's cells one cook's. */
describe("the cooks crossing (src/service-crossing.js)", () => {
  it("holds one cook a cell unless asked, and always one where a station is worked from", () => {
    const state = createService(KITCHENS.brigade, [], {});
    assert.deepEqual(reservationsOf(state.kitchen, KITCHENS.brigade), {});
    const { capacity, single } = reservationsOf(state.kitchen, { ...KITCHENS.brigade, crossing: true });
    assert.equal(capacity, 2);
    const alone = new Set(single.map(keyOf));
    assert.equal(alone.size, single.length);
    for (const station of state.kitchen.stations) for (const cell of station.access) assert.ok(alone.has(keyOf(cell)), keyOf(cell));
  });

  it("lets cooks share an aisle's cell, never a station's, and books none twice", () => {
    for (const id of ["couloir", "brigade", "detour"]) {
      const setup = { ...KITCHENS[id], tables: TABLES, crossing: true };
      const state = createService(setup, drawOrders(3, setup), { human: "urgent", seed: 3 });
      const work = new Set(state.kitchen.stations.flatMap((station) => station.access.map(keyOf)));
      let together = 0;
      resetTrace();
      while (!isOver(state)) {
        stepService(state, RULES.table, HUMANS.urgent);
        const atWork = state.cooks.map(keyOf).filter((key) => work.has(key));
        assert.equal(new Set(atWork).size, atWork.length, `${id}, tour ${state.t} : ${atWork.join(" ")}`);
        const byCell = Map.groupBy(state.cooks, keyOf);
        assert.ok([...byCell.values()].every((cooks) => cooks.length <= 2), `${id}, tour ${state.t} : trois cuisiniers sur une case`);
        if (byCell.size < state.cooks.length) together += 1;
      }
      assert.equal(traceSnapshot().counters.grid?.overbooked, undefined, id);
      // Two cooks met in an aisle (3 or 4 turns of these services, 28/10).
      assert.ok(together > 0, id);
    }
  });
});
