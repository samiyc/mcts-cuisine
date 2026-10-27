import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resetTrace, traceSnapshot } from "mcts-commun/trace.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { BANQUET } from "../src/service-banquet.js";
import { createService, drawOrders, isOver, stepService } from "../src/simulate.js";

/**
 * A cook stopped where he stands (src/service-legs.js, `holdHere`) held the cell for good, and a robot due there two
 * steps later walked onto it (27/10/2026: the traces of the night counted cells booked twice outside the search).
 * The pass-through kitchen, a banquet in batches of three, the backward planning, service 5: both on (2, 4) at turn 48.
 */
describe("a cook who stops where he stands (src/service-legs.js)", () => {
  it("makes the robots due on his cell plan again: no cell booked twice, no two cooks on one cell", () => {
    const setup = { ...KITCHENS.comptoirs, banquet: { ...BANQUET, batch: 3 } };
    resetTrace();
    const state = createService(setup, drawOrders(5, setup), { human: "nearest", seed: 5 });
    while (!isOver(state)) {
      stepService(state, RULES.retro, HUMANS.nearest);
      const cells = state.cooks.map((cook) => `${cook.x},${cook.y}`);
      assert.equal(new Set(cells).size, cells.length, `tour ${state.t} : ${cells.join(" ")}`);
    }
    assert.equal(traceSnapshot().counters.grid?.overbooked, undefined);
  });
});
