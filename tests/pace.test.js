import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { pressKey } from "../src/replay.js";
import { HUMANS, RULES } from "../src/rules.js";
import { positionAt, stepAt } from "../src/service-legs.js";
import { beginTurn, createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The pace (Sami, 26/10/2026: walk faster, as long as nobody overlaps): `pace` cells a turn, reserved step by step. */
const paced = (id, pace) => ({ ...KITCHENS[id], pace });

/** At every step of the turn just played: no two cooks on one cell, no two swapping cells. */
function assertSteps(state, from, label) {
  let before = state.cooks.map((cook) => positionAt(cook.path ?? [cook], from));
  for (let step = from + 1; step <= stepAt(state); step += 1) {
    const at = state.cooks.map((cook) => positionAt(cook.path ?? [cook], step));
    assert.equal(new Set(at.map((cell) => `${cell.x},${cell.y}`)).size, at.length, `${label}, pas ${step} : deux cuisiniers dans la même case`);
    for (let a = 0; a < at.length; a += 1) {
      for (let b = a + 1; b < at.length; b += 1) assert.ok(!(at[a].x === before[b].x && at[a].y === before[b].y && at[b].x === before[a].x && at[b].y === before[a].y), `${label}, pas ${step} : ${a + 1} et ${b + 1} se croisent`);
    }
    before = at;
  }
}

describe("the pace (src/service-legs.js)", () => {
  it("walks two or three cells a turn without anyone sharing a cell or swapping, at any step", () => {
    for (const pace of [2, 3]) {
      for (const id of Object.keys(KITCHENS)) {
        const setup = paced(id, pace);
        const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
        while (!isOver(state)) {
          const from = stepAt(state);
          stepService(state, RULES.quickest, HUMANS.urgent);
          assertSteps(state, from, `${id} au pas ${pace}, tour ${state.t}`);
        }
      }
    }
  });

  it("serves sooner when the cooks walk faster: the same work, less walking", () => {
    for (const id of ["petite", "brigade", "detour"]) {
      const slow = runService(KITCHENS[id], 1, RULES.quickest, HUMANS.urgent).measures;
      const fast = runService(paced(id, 3), 1, RULES.quickest, HUMANS.urgent).measures;
      assert.ok(fast.meanServe < slow.meanServe && fast.onTime >= slow.onTime, `${id} : ${slow.meanServe} → ${fast.meanServe}`);
    }
  });

  it("lets the chef take as many steps a turn as the pace, a key more starting the turn again", () => {
    const setup = paced("petite", 2);
    const state = createService(setup, drawOrders(1, setup), { human: null, seed: 1, manual: true });
    const chef = state.cooks.find((cook) => cook.manual);
    const { x, y } = chef;
    beginTurn(state, null);
    assert.equal(pressKey(state, "d"), null);
    assert.equal(pressKey(state, "d"), null);
    stepService(state, RULES.quickest, null);
    assert.deepEqual([chef.x, chef.y], [x + 2, y]);
    // A third key in a turn replaces the turn's two: one cell from where he stands.
    beginTurn(state, null);
    for (const key of ["q", "q", "s"]) pressKey(state, key);
    stepService(state, RULES.quickest, null);
    assert.deepEqual([chef.x, chef.y], [x + 2, y + 1]);
  });
});
