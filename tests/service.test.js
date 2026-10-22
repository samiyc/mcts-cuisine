import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readKitchen } from "../src/kitchen.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES, compareRules } from "../src/rules.js";
import { createService, drawOrders, isOver, measuresOf, runService, stepService, stepsOf } from "../src/simulate.js";

/** Plays a service turn by turn, checking that no two cooks share a cell or swap, and no board or stove serves two. */
function playChecked(setup, seed, rule, humanName) {
  const human = HUMANS[humanName] ?? null;
  const state = createService(setup, drawOrders(seed, setup), { human: human ? humanName : null, seed });
  let before = state.cooks.map((cook) => ({ ...cook }));
  while (!isOver(state)) {
    stepService(state, rule, human);
    const cells = state.cooks.map((cook) => `${cook.x},${cook.y}`);
    assert.equal(new Set(cells).size, cells.length, `service ${seed}, tour ${state.t} : deux cuisiniers dans la même case`);
    assert.ok(state.cooks.every((cook) => state.kitchen.floor(state.kitchen.plan.at(cook.x, cook.y))));
    for (const a of state.cooks) {
      for (const b of state.cooks) {
        const was = (cook) => before.find((one) => one.id === cook.id);
        const swapped = a.id < b.id && a.x === was(b).x && a.y === was(b).y && b.x === was(a).x && b.y === was(a).y;
        assert.ok(!swapped, `service ${seed}, tour ${state.t} : ${a.id} et ${b.id} se croisent`);
      }
    }
    const busy = state.cooks.filter((cook) => cook.phase === "working" && ["C", "P"].includes(cook.station?.kind)).map((cook) => `${cook.station.x},${cook.station.y}`);
    assert.equal(new Set(busy).size, busy.length, `service ${seed}, tour ${state.t} : un poste pour deux`);
    before = state.cooks.map((cook) => ({ ...cook }));
  }
  return state;
}

describe("the kitchen (src/kitchen.js, src/simulate.js)", () => {
  it("reads a kitchen: its stations with the cells to work them from, the robots' and the human's places", () => {
    const kitchen = readKitchen(KITCHENS.petite.text);
    assert.equal(kitchen.robots.length, 2);
    assert.deepEqual(kitchen.human, { x: 4, y: 2 });
    const kinds = kitchen.stations.map((station) => station.kind).sort().join("");
    assert.equal(kinds, "CCPPSot");
    assert.ok(kitchen.stations.every((station) => station.access.length > 0));
    assert.throws(() => readKitchen("#o#\n#H#"), /il manque/);
  });

  it("draws the same orders from the same seed, each a chain of steps", () => {
    assert.deepEqual(drawOrders(4, KITCHENS.petite), drawOrders(4, KITCHENS.petite));
    assert.ok(drawOrders(4, KITCHENS.petite).every((order) => order.arrival <= KITCHENS.petite.lastOrder && order.deadline === order.arrival + KITCHENS.petite.patience));
    assert.deepEqual(stepsOf("soupe").map((step) => step.type), ["fetch", "cut", "cook", "serve"]);
    assert.deepEqual(stepsOf("salade").map((step) => step.type), ["fetch", "cut", "serve"]);
  });

  it("never puts two cooks in one cell, never lets them swap, never shares a board or a stove", () => {
    for (const setup of Object.values(KITCHENS)) {
      for (let seed = 1; seed <= 5; seed += 1) for (const humanName of ["urgent", "random", "none"]) playChecked(setup, seed, RULES.oldest, humanName);
    }
  });

  it("serves dishes through their steps, the same service from the same seed", () => {
    const { state, measures } = runService(KITCHENS.petite, 2, RULES.oldest, HUMANS.urgent);
    assert.ok(measures.onTime > 0);
    assert.equal(measures.onTime + measures.late + measures.missed, measures.orders);
    assert.ok(state.log.some((event) => event.type === "served"));
    assert.deepEqual(runService(KITCHENS.couloir, 3, RULES.quickest, HUMANS.random, "random").measures, runService(KITCHENS.couloir, 3, RULES.quickest, HUMANS.random, "random").measures);
    assert.deepEqual(measuresOf(createService(KITCHENS.petite, [])), { orders: 0, onTime: 0, late: 0, missed: 0, meanServe: 0, moves: 0, waits: 0 });
  });

  it("compares the robots' rules by pairs on the same services", () => {
    const result = compareRules(KITCHENS.petite, { services: 20, humanName: "urgent" });
    assert.deepEqual(Object.keys(result), ["oldest", "quickest"]);
    assert.equal(result.oldest.gain.mean, 0);
    assert.equal(result.quickest.gain.n, 20);
  });
});
