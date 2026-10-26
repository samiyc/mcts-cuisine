import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { PLATES } from "../src/service-plates.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The dish room (Sami, 26/10/2026, the evening): plates counted, washed at a sink. */
const plates = (stock, roles = []) => ({ ...KITCHENS.plonge, plates: { ...PLATES, stock }, roles });

describe("the dish room (src/service-plates.js)", () => {
  it("keeps every plate somewhere: clean, in a cook's hand, on its way back, dirty or in the rack", () => {
    for (const [stock, roles] of [[15, []], [8, [null, null, null, "plonge"]]]) {
      const setup = plates(stock, roles);
      const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
      while (!isOver(state)) {
        stepService(state, RULES.quickest, HUMANS.urgent);
        const { clean, dirty, returning } = state.plates;
        const held = state.cooks.filter((cook) => cook.plate).length;
        const racked = state.cooks.reduce((sum, cook) => sum + (cook.steps?.[cook.step]?.type === "wash" ? cook.rack : 0), 0);
        assert.equal(clean + dirty + returning.length + held + racked, stock);
        assert.ok(clean >= 0 && dirty >= 0);
      }
    }
  });

  it("serves a dish on a clean plate only: a cook waits for one; the dish room's robot never fetches nor cuts", () => {
    const tight = runService(plates(8), 1, RULES.quickest, HUMANS.urgent);
    assert.ok(tight.measures.waitPlate > 0 && tight.measures.fewestPlates === 0);
    const setup = plates(15, [null, null, null, "plonge"]);
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    const washer = state.cooks.find((cook) => cook.role === "plonge");
    while (!isOver(state)) {
      stepService(state, RULES.quickest, HUMANS.urgent);
      assert.ok(!washer.steps?.some((step) => step.type === "fetch" || step.type === "cut"), "il ne prend ni ingrédient ni planche");
    }
    assert.ok(state.log.some((event) => event.type === "wash" && event.cook === washer.id));
  });

  it("writes out the plates of service-plates.js, and is off in every other kitchen", () => {
    assert.deepEqual(KITCHENS.plonge.plates, { ...PLATES });
    assert.equal("waitPlate" in runService(KITCHENS.brigade, 1, RULES.quickest, HUMANS.urgent).measures, false);
  });
});
