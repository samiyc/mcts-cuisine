import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { DELIVERY, PACKING } from "../src/service-delivery.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The packing station (step 3 of docs/recherche/feuille-de-route.md, Sami, 26/10/2026, the evening). */
describe("the packing station (src/service-delivery.js, the dark kitchen)", () => {
  it("packs every delivered dish at the station E before the pass", () => {
    const setup = KITCHENS.dark;
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    let packing = 0;
    while (!isOver(state)) {
      stepService(state, RULES.quickest, HUMANS.urgent);
      for (const cook of state.cooks.filter((one) => one.phase === "working" && one.steps?.[one.step]?.type === "pack")) {
        assert.equal(cook.station.kind, "E");
        packing += 1;
      }
    }
    const served = state.upcoming.filter((order) => order.status === "served");
    assert.ok(packing > 0 && served.length > 0);
    assert.ok(served.every((order) => order.packed), "chaque plat livré est emballé");
    const { measures } = runService(setup, 1, RULES.quickest, HUMANS.urgent);
    assert.ok(measures.usePack > 0);
  });

  it("writes out the delivery settings of service-delivery.js, and packs nothing without packing or without a station", () => {
    const { packing, ...rest } = KITCHENS.dark.delivery;
    assert.deepEqual(rest, { ...DELIVERY });
    assert.equal(packing, PACKING);
    const unpacked = runService({ ...KITCHENS.dark, delivery: DELIVERY }, 1, RULES.quickest, HUMANS.urgent).state;
    assert.ok(unpacked.upcoming.every((order) => !order.packed));
    const noStation = runService({ ...KITCHENS.petite, delivery: { ...DELIVERY, packing: 2 } }, 1, RULES.quickest, HUMANS.urgent).state;
    assert.ok(noStation.upcoming.every((order) => !order.packed));
  });
});
